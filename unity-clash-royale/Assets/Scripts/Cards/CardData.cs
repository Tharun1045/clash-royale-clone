using ClashClone.Units;
using UnityEngine;

namespace ClashClone.Cards
{
    [CreateAssetMenu(fileName = "NewCardData", menuName = "Clash Clone/Card Data")]
    public class CardData : ScriptableObject
    {
        [Header("Card Info")]
        [SerializeField] private string cardName = "New Card";
        [SerializeField] [Range(1, 10)] private int elixirCost = 3;
        [SerializeField] private Sprite cardIcon;
        [SerializeField] private CardType type = CardType.Troop;

        [Header("Prefab Setup")]
        [Tooltip("The prefab instantiated when deploying this card.")]
        [SerializeField] private GameObject spawnPrefab;

        [Header("Unit Properties (Only if Troop or Building)")]
        [Tooltip("Troop base stats configuration.")]
        [SerializeField] private UnitData unitStats;

        // Public properties
        public string CardName => cardName;
        public int ElixirCost => elixirCost;
        public Sprite CardIcon => cardIcon;
        public CardType Type => type;
        public GameObject SpawnPrefab => spawnPrefab;
        public UnitData UnitStats => unitStats;
    }

    public enum CardType
    {
        Troop,
        Spell,
        Building
    }
}
