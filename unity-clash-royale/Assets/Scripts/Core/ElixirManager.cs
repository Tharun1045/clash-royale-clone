using System;
using UnityEngine;

namespace ClashClone.Core
{
    public class ElixirManager : MonoBehaviour
    {
        public static ElixirManager Instance { get; private set; }

        [Header("Elixir Config")]
        [SerializeField] private float initialElixir = 5f;
        [SerializeField] private float maxElixir = 10f;
        [SerializeField] private float elixirRegenRate = 1f; // Amount of elixir regenerated per second

        private float currentElixir;
        private float regenMultiplier = 1f;

        // Event for UI to bind to
        public event Action<float> OnElixirChanged; // (currentElixirValue)

        public float CurrentElixir => currentElixir;
        public float MaxElixir => maxElixir;

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

            currentElixir = initialElixir;
        }

        private void Update()
        {
            RegenerateElixir(Time.deltaTime);
        }

        private void RegenerateElixir(float deltaTime)
        {
            if (currentElixir >= maxElixir) return;

            currentElixir = Mathf.Min(maxElixir, currentElixir + (elixirRegenRate * regenMultiplier * deltaTime));
            OnElixirChanged?.Invoke(currentElixir);
        }

        public bool CanSpend(int amount)
        {
            return currentElixir >= amount;
        }

        public bool SpendElixir(int amount)
        {
            if (CanSpend(amount))
            {
                currentElixir -= amount;
                OnElixirChanged?.Invoke(currentElixir);
                return true;
            }
            return false;
        }

        public void SetRegenMultiplier(float multiplier)
        {
            if (multiplier < 0) return;
            regenMultiplier = multiplier;
            Debug.Log($"Elixir Regeneration multiplier updated to: {multiplier}x");
        }
    }
}
