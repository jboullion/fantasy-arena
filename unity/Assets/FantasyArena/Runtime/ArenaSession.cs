using System;
using System.Collections.Generic;
using FantasyArena.Core;
using Unity.Collections;
using Unity.Netcode;
using Unity.Netcode.Transports.UTP;
using UnityEngine;

namespace FantasyArena
{
    // Only this adapter knows NGO. Simulation and presentation use internal actor IDs.
    public sealed class ArenaSession : MonoBehaviour
    {
        public ArenaSimulation Simulation { get; private set; } = new ArenaSimulation();
        public World World => Mode == "Guest" ? received : Simulation.State;
        public string Mode { get; private set; } = "Menu";
        public string Notice = "Choose offline play or a LAN session.";
        public int LocalId { get; private set; }
        public bool Authority => Mode == "Solo" || Mode == "Local" || Mode == "Host";
        public bool Paused;
        public bool EnableCouch = true;
        public bool IsOnline => Mode == "Host" || Mode == "Guest";
        public bool SaveReports = true;
        string archivedKey = "";
        NetworkManager manager;
        World received = new World();
        readonly Dictionary<ulong, int> owners = new Dictionary<ulong, int>();
        readonly Dictionary<int, double> inputTimes = new Dictionary<int, double>();
        int nextId = 1;
        float accumulator;
        float snapshotTimer;
        bool closing;
        public void Offline(bool couch)
        {
            Leave(); Mode = couch && EnableCouch ? "Local" : "Solo";
            Simulation = new ArenaSimulation(); LocalId = 0; Simulation.AddPlayer(0);
            Notice = Mode == "Local" ? "Press Start on additional controllers to join (up to 4)." : "Offline: no online service required.";
        }
        public void AddLocalPlayer()
        {
            if (Mode == "Local" && EnableCouch && World.stage == "lobby") Simulation.AddPlayer(World.players.Count);
        }
        public void Launch()
        {
            if (!Authority) return;
            if (IsOnline && (World.stage=="lobby"||World.stage=="shop") && World.players.Exists(p=>!p.ready)) {Notice="Everyone must ready up before launching.";return;}
            Simulation.Start(); Paused = false;
        }
        public void Command(string action, string value, int playerId = -1)
        {
            int id = playerId < 0 ? LocalId : playerId;
            if (Authority) ApplyCommand(id, action, value);
            else if (Mode == "Guest" && manager != null && manager.IsConnectedClient)
            {
                using var writer = new FastBufferWriter(256, Allocator.Temp);
                writer.WriteValueSafe(action); writer.WriteValueSafe(value);
                manager.CustomMessagingManager.SendNamedMessage("command", NetworkManager.ServerClientId, writer);
            }
        }
        void ApplyCommand(int id, string action, string value)
        {
            if(action=="ready"&&(World.stage=="lobby"||World.stage=="shop"))
            {var player=World.players.Find(p=>p.id==id);if(player!=null&&bool.TryParse(value,out bool ready))player.ready=ready;return;}
            bool ok = action == "class" ? Simulation.ChooseClass(id, value) : action == "buy" && Simulation.Buy(id, value);
            if (!ok && id == LocalId) Notice = "Action unavailable: check stage, gold and current offers.";
        }
        void CommandMessage(ulong sender, FastBufferReader reader)
        {
            if (!Authority || !owners.TryGetValue(sender, out int id) || reader.Length > 256) return;
            reader.ReadValueSafe(out string action); reader.ReadValueSafe(out string value);
            ApplyCommand(id, action, value);
        }
        public void Connect(bool host, string address)
        {
            if (manager != null) { Leave(); Notice = "Previous session cleared. Choose Host or Join again."; return; }
            Leave(); Mode = host ? "Host" : "Guest"; closing = false; nextId = 1;
            Simulation = new ArenaSimulation(); received = new World(); LocalId = host ? 0 : -1;
            var go = new GameObject("LAN session");
            var transport = go.AddComponent<UnityTransport>();
            transport.SetConnectionData(address, 7777, host ? "0.0.0.0" : null);
            manager = go.AddComponent<NetworkManager>();
            manager.NetworkConfig = new NetworkConfig { NetworkTransport = transport, EnableSceneManagement = false, ConnectionApproval = true };
            manager.NetworkConfig.ConnectionData = System.Text.Encoding.UTF8.GetBytes("fantasy-arena:2");
            manager.ConnectionApprovalCallback = (request, response) =>
            {
                bool valid = System.Text.Encoding.UTF8.GetString(request.Payload) == "fantasy-arena:2";
                response.Approved = valid && Simulation.State.stage == "lobby" && Simulation.State.players.Count < 4;
                response.CreatePlayerObject = false; response.Pending = false;
                response.Reason = valid ? "The lobby is full or the round has started." : "Incompatible game version.";
            };
            manager.OnClientConnectedCallback += Connected;
            manager.OnClientDisconnectCallback += Disconnected;
            bool success = host ? manager.StartHost() : manager.StartClient();
            if (!success) { Leave(); Notice = "Could not start LAN networking. Check address and port 7777."; return; }
            manager.CustomMessagingManager.RegisterNamedMessageHandler("input", InputMessage);
            manager.CustomMessagingManager.RegisterNamedMessageHandler("world", WorldMessage);
            manager.CustomMessagingManager.RegisterNamedMessageHandler("identity", IdentityMessage);
            manager.CustomMessagingManager.RegisterNamedMessageHandler("command", CommandMessage);
            Notice = host ? "LAN host • port 7777. Wait for friends, then launch." : "Connecting to LAN host...";
        }
        void Connected(ulong client)
        {
            if (!manager.IsServer) return;
            int id = client == NetworkManager.ServerClientId ? 0 : nextId++;
            owners[client] = id; Simulation.AddPlayer(id);
            if (client != NetworkManager.ServerClientId)
            { using var writer = new FastBufferWriter(sizeof(int), Allocator.Temp); writer.WriteValueSafe(id); manager.CustomMessagingManager.SendNamedMessage("identity", client, writer); }
        }
        void IdentityMessage(ulong sender, FastBufferReader reader)
        { if (sender != NetworkManager.ServerClientId || Mode != "Guest") return; reader.ReadValueSafe(out int id); LocalId = id; Notice = "Connected. Waiting for the host to launch."; }
        void InputMessage(ulong sender, FastBufferReader reader)
        {
            if (!Authority || !owners.TryGetValue(sender, out int id) || !reader.TryBeginRead(sizeof(float) * 2)) return;
            reader.ReadValueSafe(out float x); reader.ReadValueSafe(out float z);
            Simulation.SetInput(id, x, z); inputTimes[id] = Time.realtimeSinceStartupAsDouble;
        }
        void WorldMessage(ulong sender, FastBufferReader reader)
        {
            if (Mode != "Guest" || sender != NetworkManager.ServerClientId) return;
            reader.ReadValueSafe(out string json); var state = JsonUtility.FromJson<World>(json);
            if (state != null && state.protocol == 2) { received = state; Archive(); }
        }
        void Disconnected(ulong client)
        {
            if (closing) return;
            if (Mode == "Guest") { Notice = "Host disconnected or connection rejected. Return to the menu to reconnect."; Mode = "Disconnected"; }
            else if (owners.TryGetValue(client, out int id))
            { Simulation.SetInput(id, 0, 0); Simulation.State.players.RemoveAll(p => p.id == id); owners.Remove(client); }
        }
        public void Input(int id, Vector2 movement)
        {
            if (Authority) Simulation.SetInput(id, movement.x, movement.y);
            else if (Mode == "Guest" && manager != null && manager.IsConnectedClient)
            {
                using var writer = new FastBufferWriter(sizeof(float) * 2, Allocator.Temp);
                writer.WriteValueSafe(movement.x); writer.WriteValueSafe(movement.y);
                manager.CustomMessagingManager.SendNamedMessage("input", NetworkManager.ServerClientId, writer, NetworkDelivery.UnreliableSequenced);
            }
        }
        void Update()
        {
            if (!Authority || (Paused && !IsOnline)) return;
            accumulator = Mathf.Min(accumulator + Time.unscaledDeltaTime, .25f);
            while (accumulator >= ArenaSimulation.Step)
            {
                accumulator -= ArenaSimulation.Step;
                foreach (var pair in inputTimes) if (Time.realtimeSinceStartupAsDouble - pair.Value > .3) Simulation.SetInput(pair.Key, 0, 0);
                Simulation.Tick();
            }
            Archive();
            snapshotTimer += Time.unscaledDeltaTime;
            if (Mode == "Host" && manager != null && snapshotTimer >= .05f)
            {
                snapshotTimer = 0;
                string json = JsonUtility.ToJson(World);
                using var writer = new FastBufferWriter(System.Text.Encoding.UTF8.GetByteCount(json) * 2 + 64, Allocator.Temp);
                writer.WriteValueSafe(json);
                foreach (ulong client in manager.ConnectedClientsIds)
                    if (client != NetworkManager.ServerClientId) manager.CustomMessagingManager.SendNamedMessage("world", client, writer, NetworkDelivery.ReliableFragmentedSequenced);
            }
        }
        void Archive()
        {
            if (!SaveReports || World.revision == 0 || World.runId == "") return;
            string key = World.runId + ":" + World.revision;
            if (key == archivedKey) return;
            archivedKey = key;
            try { ArenaArchive.Save(World); }
            catch (Exception error) { Notice = "Could not save run report: " + error.Message; Debug.LogWarning(Notice); }
        }
        public void Leave()
        {
            closing = true;
            if (manager != null) { manager.Shutdown(); Destroy(manager.gameObject); manager = null; }
            owners.Clear(); inputTimes.Clear(); accumulator = 0; Paused = false; Mode = "Menu";
        }
        void OnDestroy() => Leave();
    }
}
