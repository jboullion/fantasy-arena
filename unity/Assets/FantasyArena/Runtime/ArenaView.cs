using System.Collections.Generic;
using FantasyArena.Core;
using UnityEngine;
using UnityEngine.InputSystem;

namespace FantasyArena
{
    public sealed class ArenaView : MonoBehaviour
    {
        public ArenaSession Session;
        readonly Dictionary<int, GameObject> actors = new Dictionary<int, GameObject>();
        readonly Dictionary<int, Gamepad> devices = new Dictionary<int, Gamepad>();
        Camera cameraView;
        GameObject warrior, goblin;
        float sendTimer;
        public bool Automated;
        public string Address = "127.0.0.1";
        public void ResetDevices() { devices.Clear(); }
        void Start()
        {
            cameraView = Camera.main;
            warrior = Resources.Load<GameObject>("Models/warrior"); goblin = Resources.Load<GameObject>("Models/goblin");
            Debug.Log($"ARENA_ASSETS warrior={warrior != null} goblin={goblin != null}");
        }
        void Update()
        {
            var keyboard = Keyboard.current;
            if (keyboard != null && keyboard.escapeKey.wasPressedThisFrame && !Session.IsOnline) Session.Paused = !Session.Paused;
            if (Session.Mode == "Local" && Session.World.stage == "lobby")
                foreach (var pad in Gamepad.all)
                    if (pad.startButton.wasPressedThisFrame && !devices.ContainsValue(pad))
                    {
                        int slot = devices.ContainsKey(0) || (keyboard != null && keyboard.spaceKey.isPressed) ? Session.World.players.Count : 0;
                        if (slot >= 4) continue;
                        devices[slot] = pad;
                        if (slot > 0) Session.AddLocalPlayer();
                    }
            sendTimer += Time.unscaledDeltaTime;
            if (sendTimer >= 1f / 30)
            {
                sendTimer = 0;
                Vector2 move = Vector2.zero;
                if (Application.isFocused && keyboard != null)
                    move = new Vector2((keyboard.dKey.isPressed ? 1 : 0) - (keyboard.aKey.isPressed ? 1 : 0), (keyboard.wKey.isPressed ? 1 : 0) - (keyboard.sKey.isPressed ? 1 : 0));
                if (Session.Mode != "Local" && Gamepad.current != null && Application.isFocused) move += Gamepad.current.leftStick.ReadValue();
                if (Automated) move = new Vector2(Mathf.Cos(Time.unscaledTime), Mathf.Sin(Time.unscaledTime));
                if (Session.Mode != "Local" || !devices.ContainsKey(0)) Session.Input(Session.LocalId, Vector2.ClampMagnitude(move, 1));
                foreach (var pair in devices)
                    Session.Input(pair.Key, pair.Value.added && (Application.isFocused || Automated) ? pair.Value.leftStick.ReadValue() : Vector2.zero);
            }
            var visible = new HashSet<int>();
            foreach (var p in Session.World.players) Draw(p, true, visible);
            foreach (var e in Session.World.enemies) Draw(e, false, visible);
            foreach (var pair in actors) if (!visible.Contains(pair.Key)) pair.Value.SetActive(false);
            Vector3 center = Vector3.zero; float radius = 0;
            var players = Session.World.players;
            if (players.Count > 0)
            {
                foreach (var p in players) center += new Vector3(p.x, 0, p.z);
                center /= players.Count;
                foreach (var p in players) radius = Mathf.Max(radius, Vector3.Distance(center, new Vector3(p.x, 0, p.z)));
            }
            if (cameraView != null)
            {
                Vector3 desired = center + new Vector3(0, 19 + radius * 1.4f, -16 - radius);
                cameraView.transform.position = Vector3.Lerp(cameraView.transform.position, desired, 1 - Mathf.Exp(-5 * Time.unscaledDeltaTime));
                cameraView.transform.LookAt(center);
            }
        }
        void Draw(Actor actor, bool player, HashSet<int> visible)
        {
            visible.Add(actor.id);
            if (!actors.TryGetValue(actor.id, out var go))
            {
                var prefab = player ? warrior : goblin;
                go = prefab != null ? Instantiate(prefab) : GameObject.CreatePrimitive(PrimitiveType.Capsule);
                go.name = (player ? "Player " : "Goblin ") + actor.id; actors[actor.id] = go;
            }
            go.SetActive(true);
            Vector3 target = new Vector3(actor.x, 0, actor.z);
            go.transform.position = Vector3.Lerp(go.transform.position, target, Session.Mode == "Guest" ? 1 - Mathf.Exp(-18 * Time.unscaledDeltaTime) : 1);
            go.transform.rotation = actor.hp <= 0 ? Quaternion.Euler(0, 0, 90) : Quaternion.LookRotation(new Vector3(actor.facingX, 0, actor.facingZ));
        }
    }
}
