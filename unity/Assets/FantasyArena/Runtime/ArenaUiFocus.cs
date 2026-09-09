using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;

namespace FantasyArena
{
    // Keep keyboard/controller focus visible inside the responsive menu viewport.
    public sealed class ArenaUiFocus : MonoBehaviour, ISelectHandler, IDeselectHandler
    {
        Outline outline;
        void Awake()
        {
            outline = gameObject.AddComponent<Outline>();
            outline.effectColor = new Color(.88f,.76f,.54f,1);
            outline.effectDistance = new Vector2(2,-2);
            outline.enabled = false;
        }
        public void OnSelect(BaseEventData data)
        {
            outline.enabled = true;
            Canvas.ForceUpdateCanvases();
            var scroll = GetComponentInParent<ScrollRect>();
            if(scroll == null) return;
            var bounds = RectTransformUtility.CalculateRelativeRectTransformBounds(scroll.viewport, transform);
            var area = scroll.viewport.rect;
            float delta = bounds.min.y < area.yMin ? area.yMin - bounds.min.y : bounds.max.y > area.yMax ? area.yMax - bounds.max.y : 0;
            scroll.content.anchoredPosition += new Vector2(0,delta);
        }
        public void OnDeselect(BaseEventData data) { if(outline != null) outline.enabled = false; }
    }
}
