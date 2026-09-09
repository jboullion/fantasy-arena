using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using UnityEngine.InputSystem.UI;

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
        void Start()
        {
            font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            var canvas = new GameObject("Arena HUD", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            canvas.GetComponent<Canvas>().renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvas.GetComponent<CanvasScaler>(); scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize; scaler.referenceResolution = new Vector2(1440, 900);
            var events = new GameObject("Event System", typeof(EventSystem), typeof(InputSystemUIInputModule));
            events.GetComponent<InputSystemUIInputModule>().AssignDefaultActions();
            var panel = Box(canvas.transform, "Panel", new Vector2(360, 760));
            var rect = panel.GetComponent<RectTransform>(); rect.anchorMin = rect.anchorMax = new Vector2(0, 1); rect.pivot = new Vector2(0, 1); rect.anchoredPosition = new Vector2(24, -24);
            var layout = panel.AddComponent<VerticalLayoutGroup>(); layout.padding = new RectOffset(20,20,20,20); layout.spacing = 10; layout.childControlHeight = true; layout.childForceExpandHeight = false;
            Label(panel.transform, "FANTASY ARENA", 30, 50);
            Label(panel.transform, "UNITY FOUNDATION • ROUND ONE", 15, 30);
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
            launch = Button(panel.transform, "Launch / retry round", () => Session.Launch());
            Button(panel.transform, "Return to menu", () => Session.Leave());
            Label(panel.transform, "WASD / left stick: move\nAttacks are automatic\nEscape: offline pause\nLocal lobby: controller Start to join", 17, 115);
            EventSystem.current.SetSelectedGameObject(menu.transform.GetChild(0).gameObject);
        }
        void Update()
        {
            if (summary == null) return;
            var world = Session.World;
            string text = Session.Mode + "  •  " + world.stage.ToUpperInvariant() + (Session.Paused ? "  PAUSED" : "") + "\n";
            text += Mathf.Max(0, 60 - Mathf.FloorToInt(world.elapsed)) + " seconds   •   " + world.enemies.Count + " goblins\n";
            foreach (var p in world.players) text += $"Player {p.id + 1}: {p.hp:0} HP / {p.kills} kills\n";
            summary.text = text + "\n" + Session.Notice;
            menu.SetActive(Session.Mode == "Menu" || Session.Mode == "Disconnected");
            couch.SetActive(Session.EnableCouch);
            launch.SetActive(Session.Authority && world.stage != "playing");
            if ((previousMode != Session.Mode || previousStage != world.stage) && EventSystem.current != null)
            {
                if (menu.activeSelf) EventSystem.current.SetSelectedGameObject(menu.transform.GetChild(0).gameObject);
                else if (launch.activeSelf) EventSystem.current.SetSelectedGameObject(launch);
            }
            previousMode = Session.Mode; previousStage = world.stage;
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
            go.GetComponent<Image>().color = new Color(.24f,.3f,.22f);
            var button = go.AddComponent<Button>(); button.onClick.AddListener(action);
            var text = Label(go.transform, label, 20,44); text.alignment = TextAnchor.MiddleCenter;
            text.rectTransform.anchorMin = Vector2.zero; text.rectTransform.anchorMax = Vector2.one; text.rectTransform.offsetMin = text.rectTransform.offsetMax = Vector2.zero;
            return go;
        }
    }
}
