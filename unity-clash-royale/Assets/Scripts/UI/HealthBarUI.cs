using ClashClone.Combat;
using UnityEngine;
using UnityEngine.UI;

namespace ClashClone.UI
{
    public class HealthBarUI : MonoBehaviour
    {
        [Header("Target & Bindings")]
        [SerializeField] private Health targetHealth;
        [SerializeField] private Slider healthSlider;
        [SerializeField] private Image fillImage;

        [Header("Juice visual config")]
        [SerializeField] private Color fullHealthColor = Color.green;
        [SerializeField] private Color lowHealthColor = Color.red;
        [SerializeField] private bool hideWhenFull = true;

        private Canvas parentCanvas;

        private void Awake()
        {
            if (healthSlider == null)
            {
                healthSlider = GetComponent<Slider>();
            }

            if (targetHealth == null)
            {
                targetHealth = GetComponentInParent<Health>();
            }

            parentCanvas = GetComponentInParent<Canvas>();
        }

        private void Start()
        {
            if (targetHealth != null)
            {
                targetHealth.OnHealthChanged += HandleHealthChanged;
                // Initialize view state
                HandleHealthChanged(targetHealth.CurrentHealth, targetHealth.MaxHealth);
            }
            else
            {
                Debug.LogWarning($"HealthBarUI on [{gameObject.name}] could not locate a Health component.");
            }
        }

        private void OnDestroy()
        {
            if (targetHealth != null)
            {
                targetHealth.OnHealthChanged -= HandleHealthChanged;
            }
        }

        private void Update()
        {
            // Face the camera if in World Space mode (Billboarding)
            if (parentCanvas != null && parentCanvas.renderMode == RenderMode.WorldSpace)
            {
                Transform camTrans = Camera.main != null ? Camera.main.transform : null;
                if (camTrans != null)
                {
                    transform.LookAt(transform.position + camTrans.rotation * Vector3.forward, camTrans.rotation * Vector3.up);
                }
            }
        }

        private void HandleHealthChanged(float current, float max)
        {
            if (max <= 0f) return;

            float fraction = current / max;

            if (healthSlider != null)
            {
                healthSlider.value = fraction;
            }

            // Interpolate colors dynamically
            if (fillImage != null)
            {
                fillImage.color = Color.Lerp(lowHealthColor, fullHealthColor, fraction);
            }

            // Hide/Show conditions
            if (current <= 0f)
            {
                gameObject.SetActive(false);
            }
            else if (hideWhenFull && current >= max)
            {
                gameObject.SetActive(false);
            }
            else
            {
                gameObject.SetActive(true);
            }
        }
    }
}
