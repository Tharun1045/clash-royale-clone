using UnityEngine;

namespace ClashClone.Utilities
{
    public class CameraShake : MonoBehaviour
    {
        public static CameraShake Instance { get; private set; }

        private Vector3 originalPosition;
        private float shakeDuration = 0f;
        private float shakeIntensity = 0.5f;
        private float dampingSpeed = 1.0f;
        private bool isShaking;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
                return;
            }
        }

        private void OnEnable()
        {
            originalPosition = transform.localPosition;
        }

        public void TriggerShake(float duration, float intensity)
        {
            shakeDuration = duration;
            shakeIntensity = intensity;
            isShaking = true;
        }

        private void Update()
        {
            if (shakeDuration > 0)
            {
                transform.localPosition = originalPosition + Random.insideUnitSphere * shakeIntensity;
                shakeDuration -= Time.deltaTime * dampingSpeed;
            }
            else if (isShaking)
            {
                isShaking = false;
                shakeDuration = 0f;
                transform.localPosition = originalPosition;
            }
        }
    }
}
