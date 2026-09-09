using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;
using FantasyArena.Core;

namespace FantasyArena
{
    public sealed class ArenaHud : MonoBehaviour
    {
        public ArenaSession Session;
        public ArenaView View;
        Text summary;
        GameObject menu, launch, couch;
        InputField address;
        Font font;
        string previousMode;
        string previousStage;
        GameObject profile, shop, statsPanel, playerSelector, classButton;
        GameObject offerOne, offerTwo, armorButton;
        GameObject readyButton;
        Text statsText;
        bool showStats;
        int selectedPlayer;
        Sprite leather, brass, patina;
        RectTransform safeRoot, frame;
        ScrollRect scroll;
        GameObject statsButton, returnButton;
        Text heading;
        GameObject soundButton;
        void Start()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            leather=Resources.Load<Sprite>("UI/panel-leather"); brass=Resources.Load<Sprite>("UI/button-brass"); patina=Resources.Load<Sprite>("UI/button-patina");
            var canvas = new GameObject("Arena HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvas.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvas.GetComponent<CanvasScaler>(); scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; scaler.referenceResolution = new Vector2(1440, 900);
            scaler.matchWidthOrHeight=.5f;
            var events = new GameObject("Event System", typeof(EventSystem), typeof(InputSystemUIInputModule));
            events.GetComponent<InputSystemUIInputModule>().AssignDefaultActions();
            safeRoot=new GameObject("Safe area",typeof(RectTransform)).GetComponent<RectTransform>(); safeRoot.SetParent(canvas.transform,false);
            var shell=Box(safeRoot,"Leather menu",new Vector2(410,850)); frame=shell.GetComponent<RectTransform>();
            Skin(shell,leather,5.5f);
            var viewport=new GameObject("Viewport",typeof(RectTransform),typeof(RectMask2D));viewport.transform.SetParent(shell.transform,false);
            var vr=viewport.GetComponent<RectTransform>();vr.anchorMin=Vector2.zero;vr.anchorMax=Vector2.one;vr.offsetMin=new Vector2(20,20);vr.offsetMax=new Vector2(-20,-20);
            var panel=new GameObject("Content",typeof(RectTransform));panel.transform.SetParent(viewport.transform,false);
            var rect=panel.GetComponent<RectTransform>();rect.anchorMin=new Vector2(0,1);rect.anchorMax=Vector2.one;rect.pivot=new Vector2(.5f,1);rect.sizeDelta=Vector2.zero;
            var layout = panel.AddComponent<VerticalLayoutGroup>(); layout.padding = new RectOffset(8,8,8,8); layout.spacing = 10; layout.childControlHeight = true; layout.childForceExpandHeight = false;
            panel.AddComponent<ContentSizeFitter>().verticalFit=ContentSizeFitter.FitMode.PreferredSize;
            scroll=shell.AddComponent<ScrollRect>();scroll.viewport=vr;scroll.content=rect;scroll.horizontal=false;scroll.movementType=ScrollRect.MovementType.Clamped;scroll.scrollSensitivity=32;
            heading=Label(panel.transform, "FANTASY ARENA", 28, 48);heading.color=new Color(.88f,.76f,.54f);
            Label(panel.transform, "SIX-ROUND SURVIVAL", 15, 24);
            summary = Label(panel.transform, "", 19, 185);
            menu = new GameObject("Modes", typeof(RectTransform), typeof(VerticalLayoutGroup)); menu.transform.SetParent(panel.transform, false);
            menu.GetComponent<VerticalLayoutGroup>().spacing = 8; menu.AddComponent<LayoutElement>().preferredHeight = 255;
            Button(menu.transform, "Play offline", () => { View.ResetDevices(); Session.Offline(false); });
            couch = Button(menu.transform, "Couch co-op", () => { View.ResetDevices(); Session.Offline(true); });
            Button(menu.transform, "Host LAN game", () => Session.Connect(true, "127.0.0.1"));
            var input = Box(menu.transform, "Host address", new Vector2(300, 42)); input.AddComponent<LayoutElement>().preferredHeight = 42;
            address = input.AddComponent<InputField>(); var inputText = Label(input.transform, "127.0.0.1", 18, 42);
            var tr = inputText.rectTransform; tr.anchorMin = Vector2.zero; tr.anchorMax = Vector2.one; tr.offsetMin = new Vector2(8,0); tr.offsetMax = new Vector2(-8,0);
            address.textComponent = inputText; address.text = "127.0.0.1";
            Button(menu.transform, "Join LAN game", () => Session.Connect(false, address.text.Trim()));
            profile=Section(panel.transform,"Player setup",96);
            playerSelector=Button(profile.transform,"Select local player",()=>{selectedPlayer=(selectedPlayer+1)%Mathf.Max(1,Session.World.players.Count);});
            classButton=Button(profile.transform,"Change class",()=>
            {
                var p=Selected();if(p==null)return;
                int next=(System.Array.IndexOf(ArenaData.Classes,p.character)+1)%ArenaData.Classes.Length;
                Session.Command("class",ArenaData.Classes[next],p.id);
            });
            shop=Section(panel.transform,"Shop",144);
            offerOne=Button(shop.transform,"Weapon offer",()=>BuyOffer(0));offerTwo=Button(shop.transform,"Weapon offer",()=>BuyOffer(1));
            armorButton=Button(shop.transform,"Forged plate",()=>{var p=Selected();if(p!=null)Session.Command("buy","armor",p.id);});
            readyButton=Button(panel.transform,"Ready up",()=>{var p=Selected();if(p!=null)Session.Command("ready",(!p.ready).ToString());});
            launch = Button(panel.transform, "Launch / retry round", () => Session.Launch());
            statsButton=Button(panel.transform,"View statistics",()=>{showStats=!showStats;});
            statsPanel=Section(panel.transform,"Statistics",210);statsText=Label(statsPanel.transform,"",16,210);
            returnButton=Button(panel.transform, "Return to menu", () => {showStats=false;Session.Leave();});
            soundButton=Button(panel.transform,"Sound on",()=>View.Presentation.ToggleMute());
            Label(panel.transform, "WASD / left stick: move • Auto attack\nEscape: offline pause\nLocal lobby: controller Start to join", 15, 65);
            EventSystem.current.SetSelectedGameObject(menu.transform.GetChild(0).gameObject);
        }
        void Update()
        {
            if (summary == null) return;
            var world = Session.World;
            if(View.Presentation!=null)soundButton.GetComponentInChildren<Text>().text=View.Presentation.Muted?"Sound off":"Sound on";
            var safe=Screen.safeArea;safeRoot.anchorMin=new Vector2(safe.xMin/Screen.width,safe.yMin/Screen.height);safeRoot.anchorMax=new Vector2(safe.xMax/Screen.width,safe.yMax/Screen.height);safeRoot.offsetMin=safeRoot.offsetMax=Vector2.zero;
            bool portrait=Screen.width<Screen.height;
            frame.anchorMin=new Vector2(portrait?0:1,0);frame.anchorMax=new Vector2(1,portrait?.57f:1);frame.pivot=new Vector2(1,1);
            frame.offsetMin=new Vector2(portrait?12:-434,24);frame.offsetMax=new Vector2(-24,-24);
            bool atMenu=Session.Mode=="Menu"||Session.Mode=="Disconnected";
            heading.text=atMenu?"FANTASY ARENA":showStats?"RUN STATISTICS":Session.Paused?"PAUSED":world.stage=="shop"?"CAMP SHOP":world.stage=="victory"?"VICTORY":world.stage=="defeat"?"DEFEAT":world.stage=="lobby"?"YOUR ADVENTURER":"FANTASY ARENA";
            string text = Session.Mode + "  •  " + world.stage.ToUpperInvariant() + (Session.Paused ? "  PAUSED" : "") + "\n";
            text += $"Round {world.round}/6 • {Mathf.Max(0,60-Mathf.FloorToInt(world.elapsed))}s • {world.enemies.Count} enemies\n";
            foreach (var p in world.players) text += $"P{p.id+1} {p.character}: {p.hp:0} HP • {p.gold} gold{(p.ready?" ✓":"")}\n";
            summary.text = text + "\n" + Session.Notice;
            if(atMenu)summary.text="Gather your party. Survive the arena.\n\nPlay solo, share a screen, or join friends on your local network.\n\n"+Session.Notice;
            summary.GetComponent<LayoutElement>().preferredHeight=atMenu?140:85+world.players.Count*25;
            statsButton.SetActive(!atMenu);returnButton.SetActive(!atMenu);
            statsButton.GetComponentInChildren<Text>().text=showStats?"Back to game details":"View statistics";
            menu.SetActive(Session.Mode == "Menu" || Session.Mode == "Disconnected");
            couch.SetActive(Session.EnableCouch);
            var selected=Selected();
            profile.SetActive(!showStats && selected!=null && (world.stage=="lobby"||world.stage=="shop") && Session.Mode!="Menu");
            playerSelector.SetActive(Session.Mode=="Local");
            playerSelector.GetComponentInChildren<Text>().text=$"Shopping / setup: Player {(selected?.id??0)+1}";
            classButton.SetActive(world.stage=="lobby");
            classButton.GetComponentInChildren<Text>().text="Class: "+(selected?.character??"warrior")+" (change)";
            profile.GetComponent<LayoutElement>().preferredHeight=Session.Mode=="Local"?(world.stage=="lobby"?96:44):44;
            shop.SetActive(!showStats && world.stage=="shop" && selected!=null);
            readyButton.SetActive(Session.IsOnline&&(world.stage=="lobby"||world.stage=="shop"));
            readyButton.GetComponentInChildren<Text>().text=selected!=null&&selected.ready?"Ready ✓ (change)":"Ready up";
            SetOffer(offerOne,selected,0);SetOffer(offerTwo,selected,1);
            armorButton.GetComponentInChildren<Text>().text=$"Forged plate • {70+(selected?.armorLevel??0)*35} gold";
            armorButton.GetComponent<Button>().interactable=selected!=null&&selected.armorLevel<5&&selected.gold>=70+selected.armorLevel*35;
            launch.SetActive(Session.Authority && (world.stage=="lobby"||world.stage=="shop"||world.stage=="defeat"));
            launch.GetComponentInChildren<Text>().text=world.stage=="shop"?$"Launch round {world.round+1}":world.stage=="defeat"?$"Retry round {world.round}":"Launch run";
            statsPanel.SetActive(showStats&&!atMenu);statsText.text="";
            if(showStats)foreach(var p in world.players)
            {
                statsText.text+=$"P{p.id+1} {p.character}: {p.kills} kills\nDamage {p.totalDamage:0} • Taken {p.damageTaken:0}\n";
                foreach(var entry in p.damageByType)statsText.text+=$"{entry.id}: {entry.damage:0}  ";
                statsText.text+="\n";
            }
            statsPanel.GetComponent<LayoutElement>().preferredHeight=Mathf.Max(100,world.players.Count*100);
            statsText.GetComponent<LayoutElement>().preferredHeight=Mathf.Max(100,world.players.Count*100);
            if ((previousMode != Session.Mode || previousStage != world.stage) && EventSystem.current != null)
            {
                if (menu.activeSelf) EventSystem.current.SetSelectedGameObject(menu.transform.GetChild(0).gameObject);
                else if (launch.activeSelf) EventSystem.current.SetSelectedGameObject(launch);
                else if (readyButton.activeSelf) EventSystem.current.SetSelectedGameObject(readyButton);
                scroll.verticalNormalizedPosition=1;
            }
            previousMode = Session.Mode; previousStage = world.stage;
        }
        Actor Selected()
        {
            var players=Session.World.players;
            if(Session.Mode=="Local")return players.Count==0?null:players[Mathf.Clamp(selectedPlayer,0,players.Count-1)];
            return players.Find(p=>p.id==Session.LocalId);
        }
        void BuyOffer(int index){var p=Selected();if(p!=null&&index<p.offers.Count)Session.Command("buy",p.offers[index],p.id);}
        void SetOffer(GameObject button,Actor p,int index)
        {
            string item=p!=null&&index<p.offers.Count?p.offers[index]:"";
            button.GetComponentInChildren<Text>().text=item==""?"No weapon offer":item.Replace('_',' ')+" • 80 gold";
            button.GetComponent<Button>().interactable=item!=""&&p.gold>=80&&!p.purchasedWeapon;
        }
        GameObject Section(Transform parent,string name,float height)
        {
            var go=new GameObject(name,typeof(RectTransform),typeof(VerticalLayoutGroup),typeof(LayoutElement));go.transform.SetParent(parent,false);
            var layout=go.GetComponent<VerticalLayoutGroup>();layout.spacing=8;layout.childForceExpandHeight=false;
            go.GetComponent<LayoutElement>().preferredHeight=height;return go;
        }
        GameObject Box(Transform parent, string name, Vector2 size)
        {
            var go = new GameObject(name, typeof(RectTransform), typeof(Image)); go.transform.SetParent(parent, false);
            go.GetComponent<RectTransform>().sizeDelta = size; go.GetComponent<Image>().color = new Color(.035f,.065f,.055f,.94f); return go;
        }
        Text Label(Transform parent, string value, int size, float height)
        {
            var go = new GameObject("Text", typeof(RectTransform), typeof(Text), typeof(LayoutElement)); go.transform.SetParent(parent, false);
            var text = go.GetComponent<Text>(); text.font = font; text.text = value; text.fontSize = size; text.color = new Color(.96f,.9f,.74f); text.raycastTarget = false;
            go.GetComponent<LayoutElement>().preferredHeight = height; return text;
        }
        GameObject Button(Transform parent, string label, UnityEngine.Events.UnityAction action)
        {
            var go = Box(parent, label, new Vector2(300, 44)); go.AddComponent<LayoutElement>().preferredHeight = 44;
            bool primary=label=="Play offline"||label=="Launch / retry round"||label=="Return to menu";
            Skin(go,primary?brass:patina,primary?17.5f:28);
            var button = go.AddComponent<Button>(); button.onClick.AddListener(action);
            button.onClick.AddListener(()=>{if(View.Presentation!=null)View.Presentation.Sound("click",true);});
            var colors=button.colors;colors.normalColor=Color.white;colors.highlightedColor=new Color(1.18f,1.18f,1.18f);colors.selectedColor=new Color(1.12f,1.12f,1.12f);colors.pressedColor=new Color(.75f,.75f,.75f);colors.disabledColor=new Color(.6f,.6f,.6f,.48f);button.colors=colors;
            go.AddComponent<ArenaUiFocus>();
            var text = Label(go.transform, label, 20,44); text.alignment = TextAnchor.MiddleCenter;
            text.color=primary?new Color(.09f,.1f,.07f):new Color(.965f,.933f,.85f);text.fontStyle=FontStyle.Bold;text.fontSize=18;
            text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = text.rectTransform.offsetMax = Vector2.zero;
            return go;
        }
        void Skin(GameObject go,Sprite sprite,float multiplier)
        {
            var img=go.GetComponent<Image>();img.sprite=sprite;img.type=Image.Type.Sliced;img.pixelsPerUnitMultiplier=multiplier;img.color=Color.white;
        }
    }
}
