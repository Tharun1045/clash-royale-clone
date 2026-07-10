using System;
using UnityEngine;
using UnityEngine.EventSystems;
using UnityEngine.UI;
#if USE_DOTWEEN
using DG.Tweening;
#endif

namespace ClashClone.Cards
{
    [RequireComponent(typeof(RectTransform))]
    public class CardUIDragHandler : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler, IPointerDownHandler
    {
        [Header("Drag Visual Settings")]
        [SerializeField] private float dragScaleMultiplier = 1.1f;
        [SerializeField] private float returnToHandDuration = 0.25f;

        private RectTransform rectTransform;
        private Canvas canvas;
        private CanvasGroup canvasGroup;
        
        private Vector3 startPosition;
        private Vector3 startScale;
        private int handSlotIndex = -1;
        private bool isDragging;

        // Event for drop coordinate passing
        public static event Action<int, Vector2> OnCardDropped; // (slotIndex, screenPosition)

        private void Awake()
        {
            rectTransform = GetComponent<RectTransform>();
            canvas = GetComponentInParent<Canvas>();
            
            // Add or retrieve canvas group for transparency changes during drag
            canvasGroup = GetComponent<CanvasGroup>();
            if (canvasGroup == null)
            {
                canvasGroup = gameObject.AddComponent<CanvasGroup>();
            }

            startScale = rectTransform.localScale;
        }

        public void Setup(int slotIndex)
        {
            handSlotIndex = slotIndex;
        }

        public void OnPointerDown(PointerEventData eventData)
        {
            // Save starting parameters on click/tap
            startPosition = rectTransform.anchoredPosition;
#if USE_DOTWEEN
            rectTransform.DOKill();
#endif
        }

        public void OnBeginDrag(PointerEventData eventData)
        {
            if (handSlotIndex == -1) return;
            isDragging = true;

            // Reduce transparency and scale up slightly
            canvasGroup.alpha = 0.6f;
            canvasGroup.blocksRaycasts = false;
            
#if USE_DOTWEEN
            rectTransform.DOScale(startScale * dragScaleMultiplier, 0.15f);
#else
            rectTransform.localScale = startScale * dragScaleMultiplier;
#endif
        }

        public void OnDrag(PointerEventData eventData)
        {
            if (!isDragging) return;

            // Move the card interface element with finger/cursor
            if (canvas.renderMode == RenderMode.ScreenSpaceOverlay)
            {
                rectTransform.position = eventData.position;
            }
            else
            {
                RectTransformUtility.ScreenPointToLocalPointInRectangle(
                    canvas.transform as RectTransform,
                    eventData.position,
                    canvas.worldCamera,
                    out Vector2 localPoint
                );
                rectTransform.anchoredPosition = localPoint;
            }
        }

        public void OnEndDrag(PointerEventData eventData)
        {
            if (!isDragging) return;
            isDragging = false;

            canvasGroup.alpha = 1.0f;
            canvasGroup.blocksRaycasts = true;

            // Fire drop event containing slot and screen drop position
            OnCardDropped?.Invoke(handSlotIndex, eventData.position);
            
            // Return to start position (will be overridden or cycled if deployment succeeds)
            ReturnToHandPosition();
        }

        public void ReturnToHandPosition()
        {
#if USE_DOTWEEN
            rectTransform.DOAnchorPos(startPosition, returnToHandDuration).SetEase(Ease.OutQuad);
            rectTransform.DOScale(startScale, returnToHandDuration);
#else
            StartCoroutine(FallbackSlideToPosition(startPosition, startScale, returnToHandDuration));
#endif
        }

#if !USE_DOTWEEN
        private System.Collections.IEnumerator FallbackSlideToPosition(Vector3 targetPos, Vector3 targetScale, float duration)
        {
            Vector3 startPos = rectTransform.anchoredPosition;
            Vector3 initialScale = rectTransform.localScale;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.SmoothStep(0f, 1f, elapsed / duration);
                rectTransform.anchoredPosition = Vector3.Lerp(startPos, targetPos, t);
                rectTransform.localScale = Vector3.Lerp(initialScale, targetScale, t);
                yield return null;
            }

            rectTransform.anchoredPosition = targetPos;
            rectTransform.localScale = targetScale;
        }
#endif
    }
}
