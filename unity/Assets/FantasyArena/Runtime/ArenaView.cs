using System.Collections.Generic;
using FantasyArena.Core;
using UnityEngine;
using UnityEngine.InputSystem;

namespace FantasyArena
{
    public sealed class ArenaView : MonoBehaviour
    {
        public ArenaSession Session;
        readonly Dictionary<string, GameObject> actors = new Dictionary<string, GameObject>();
        readonly Dictionary<string, string> kinds = new Dictionary<string, string>();
        readonly Dictionary<string, GameObject> prefabs = new Dictionary<string, GameObject>();
        readonly Dictionary<int, Gamepad> devices = new Dictionary<int, Gamepad>();
        Camera cameraView;
        GameObject warrior, goblin;
        Material warningMaterial;
        float sendTimer;
        public bool Automated;
        public ArenaPresentation Presentation;
        readonly HashSet<string> dead=new HashSet<string>();
        readonly Dictionary<string,float> flashes=new Dictionary<string,float>(),swings=new Dictionary<string,float>();
        int lastTick;
        string lastStage="";
        public string Address = "127.0.0.1";
        public void ResetDevices() { devices.Clear(); }
        void Start()
        {
            cameraView = Camera.main;
            Presentation=gameObject.AddComponent<ArenaPresentation>();Presentation.Session=Session;
            warrior = Resources.Load<GameObject>("Models/warrior"); goblin = Resources.Load<GameObject>("Models/goblin");
            Debug.Log($"ARENA_ASSETS warrior={warrior != null} goblin={goblin != null}");
            BuildTerrain();
        }
        void Update()
        {
            if(Session.World.tick<lastTick||Session.Mode=="Menu"){dead.Clear();flashes.Clear();swings.Clear();}
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
            var visible = new HashSet<string>();
            foreach (var p in Session.World.players) Draw(p, true, visible);
            foreach (var e in Session.World.enemies) Draw(e, false, visible);
            foreach (var shot in Session.World.projectiles)
            {
                string key="shot:"+shot.id; visible.Add(key);
                var go=Object(key,shot.kind,""); go.transform.position=new Vector3(shot.x,1.05f,shot.z);
                go.transform.rotation=Quaternion.Euler(0,shot.facing*Mathf.Rad2Deg,0);
            }
            var stale=new List<string>();
            foreach (var pair in actors) if (!visible.Contains(pair.Key))
            {
                if(pair.Key.StartsWith("enemy:")&&lastStage=="playing"&&Session.Mode!="Menu"&&Session.World.tick>=lastTick)
                    Presentation.Corpse(pair.Value,pair.Value.transform.forward*2);
                else Destroy(pair.Value);
                stale.Add(pair.Key);
            }
            foreach(var key in stale){actors.Remove(key);kinds.Remove(key);flashes.Remove(key);swings.Remove(key);}
            lastTick=Session.World.tick;lastStage=Session.World.stage;
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
        GameObject Object(string key,string kind,string equipment)
        {
            if(actors.TryGetValue(key,out var existing)&&kinds[key]!=kind+equipment){Destroy(existing);actors.Remove(key);}
            if (!actors.TryGetValue(key, out var go))
            {
                if(!prefabs.TryGetValue(kind,out var prefab)){prefab=Resources.Load<GameObject>("Models/Roster/"+kind);prefabs[kind]=prefab;}
                go = prefab != null ? Instantiate(prefab) : GameObject.CreatePrimitive(PrimitiveType.Capsule);
                go.name = key+" "+kind; actors[key] = go;kinds[key]=kind+equipment;
                if(kind!="arrow"&&kind!="magic_missile")go.AddComponent<ArenaPose>().Setup(kind,equipment);
                else
                {
                    var trail=go.AddComponent<TrailRenderer>();trail.time=.15f;trail.startWidth=.08f;trail.endWidth=0;
                    if(warningMaterial==null){warningMaterial=new Material(Shader.Find("Universal Render Pipeline/Lit"));warningMaterial.color=new Color(1,.6f,.15f);}
                    trail.sharedMaterial=warningMaterial;trail.emitting=true;
                }
            }
            return go;
        }
        void Draw(Actor actor, bool player, HashSet<string> visible)
        {
            string key=(player?"player:":"enemy:")+actor.id;visible.Add(key);
            if(dead.Contains(key))return;
            var go=Object(key,player?actor.character:actor.enemyType,actor.weapon);
            if(actor.hp<=0){Presentation.Corpse(go,go.transform.forward*2);actors.Remove(key);kinds.Remove(key);dead.Add(key);return;}
            Vector3 target = new Vector3(actor.x, 0, actor.z);
            go.transform.position = Vector3.Lerp(go.transform.position, target, Session.Mode == "Guest" ? 1 - Mathf.Exp(-18 * Time.unscaledDeltaTime) : 1);
            go.transform.rotation = Quaternion.Euler(0,actor.facing*Mathf.Rad2Deg,0);
            bool celebrating=player&&(Session.World.stage=="victory"||Session.World.stage=="shop");
            float clock=Session.World.stage=="playing"?Session.World.tick/60f:Time.time;
            if(celebrating)go.transform.position+=Vector3.up*Mathf.Max(0,Mathf.Sin(clock*5+actor.id))*.35f;
            go.GetComponent<ArenaPose>()?.Apply(actor,clock,celebrating,Session.World.stage=="playing");
            flashes.TryGetValue(key,out float flash);swings.TryGetValue(key,out float swing);
            if(actor.flash>flash+.02f){Presentation.Burst(target,player?Color.red:Color.yellow);Presentation.Sound("hit");}
            if(actor.swing>swing+.02f){Presentation.Sound(ArenaData.Ranged(actor.character)?"magic":"swing");if(ArenaData.Ranged(actor.character)||actor.weapon!="")Presentation.Burst(target,actor.weapon.Contains("ice")?Color.cyan:actor.weapon.Contains("poison")?Color.green:actor.weapon.Contains("fire")?new Color(1,.3f,.05f):new Color(.6f,.5f,1),6);}
            flashes[key]=actor.flash;swings[key]=actor.swing;
            var block=new MaterialPropertyBlock();block.SetColor("_BaseColor",actor.flash>0?new Color(1,.45f,.3f):actor.chilled>0?new Color(.5f,.85f,1):actor.poisoned>0?new Color(.6f,1,.5f):Color.white);
            foreach(var renderer in go.GetComponentsInChildren<MeshRenderer>())
            {
                if(actor.flash<=0&&actor.chilled<=0&&actor.poisoned<=0)renderer.SetPropertyBlock(null);
                else renderer.SetPropertyBlock(block);
            }
            if(!player && (actor.windup>0||actor.ai!=null&&(actor.ai.mode=="warning"||actor.ai.mode=="active")))
            {
                string ringKey="warning:"+actor.id;visible.Add(ringKey);
                if(!actors.TryGetValue(ringKey,out var ring))
                {
                    ring=new GameObject(ringKey);var line=ring.AddComponent<LineRenderer>();line.loop=true;line.useWorldSpace=false;line.positionCount=48;line.widthMultiplier=.07f;
                    if(warningMaterial==null){warningMaterial=new Material(Shader.Find("Universal Render Pipeline/Lit"));warningMaterial.color=new Color(1,.35f,.08f);}
                    line.sharedMaterial=warningMaterial;
                    for(int i=0;i<48;i++){float a=i*Mathf.PI*2/48;line.SetPosition(i,new Vector3(Mathf.Cos(a),0,Mathf.Sin(a)));}
                    actors[ringKey]=ring;kinds[ringKey]="ring";
                }
                bool special=actor.ai!=null&&actor.ai.mode!="idle";
                float radius=!special?1.35f:actor.enemyType=="brute"?3:actor.enemyType=="revenant"?2.2f:actor.enemyType=="runner"?.9f:3;
                ring.transform.position=new Vector3(special&&actor.enemyType!="runner"?actor.ai.x:actor.x,.06f,special&&actor.enemyType!="runner"?actor.ai.z:actor.z);
                ring.transform.localScale=new Vector3(radius,1,radius);
            }
        }
        void BuildTerrain()
        {
            var root=new GameObject("Seeded forest terrain");var terrain=Session.Simulation.Terrain;
            var items=new List<TerrainItem>(terrain.Obstacles);items.AddRange(terrain.Walls);items.AddRange(terrain.Grass);
            var models=new Dictionary<string,GameObject>();
            foreach(var item in items)
            {
                if(!models.TryGetValue(item.model,out var prefab)){prefab=Resources.Load<GameObject>("Models/Terrain/"+item.model);models[item.model]=prefab;}
                if(prefab==null)continue;
                var go=Instantiate(prefab,root.transform);go.transform.position=new Vector3(item.x,0,item.z);go.transform.rotation=Quaternion.Euler(0,-item.rotation*Mathf.Rad2Deg,0);go.transform.localScale=Vector3.one*item.scale;
            }
        }
        void OnDestroy(){if(warningMaterial!=null)Destroy(warningMaterial);}
    }
}
