using ClashClone.Utilities;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;

namespace ClashClone.UI
{
    public class DamageNumberText : MonoBehaviour
    {
        [Header("UI bindings")]
        [SerializeField] private Text textDisplay;
        [SerializeField] private float floatSpeed = 1.0f;
        [SerializeField] private float lifetime = 0.8f;
        [SerializeField] private float scaleMultiplier = 1.3f;

        private Vector3 originalScale;

        private void Awake()
        {
            originalScale = transform.localScale;
            if (textDisplay == null)
            {
                textDisplay = GetComponentInChildren<Text>();
            }
        }

        public void Initialize(float amount, Color textColor)
        {
            if (textDisplay != null)
            {
                textDisplay.text = $"-{Mathf.RoundToInt(amount)}";
                textDisplay.color = textColor;
            }

            transform.localScale = originalScale;
            StartCoroutine(FloatAndFadeRoutine());
        }

        private IEnumerator FloatAndFadeRoutine()
        {
            float elapsed = 0f;
            Vector3 startPos = transform.position;
            Color baseColor = textDisplay != null ? textDisplay.color : Color.white;

            while (elapsed < lifetime)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / lifetime;

                // Float upwards
                transform.position = startPos + Vector3.up * (floatSpeed * t);

                // Pop scale bump and then shrink
                float scaleScale = Mathf.Sin(t * Mathf.PI) * scaleMultiplier;
                transform.localScale = originalScale * (1f + scaleScale);

                // Fade transparency
                if (textDisplay != null)
                {
                    textDisplay.color = new Color(baseColor.r, baseColor.g, baseColor.b, 1.0f - t);
                }

                yield return null;
            }

            // Recycle itself
            if (ObjectPooler.Instance != null)
            {
                ObjectPooler.Instance.Recycle("DamageNumber", gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }
    }
}
