using System;
using System.Collections.Generic;
using UnityEngine;

namespace ClashClone.Cards
{
    public class CardHandManager : MonoBehaviour
    {
        public static CardHandManager Instance { get; private set; }

        [Header("Deck Config")]
        [SerializeField] private List<CardData> startingDeck = new List<CardData>(8);

        private List<CardData> battleDeck = new List<CardData>();
        private CardData[] activeHand = new CardData[4];
        private Queue<CardData> deckQueue = new Queue<CardData>();

        // Events for UI bindings
        public event Action<CardData[], CardData> OnHandInitialized; // (hand, nextCard)
        public event Action<int, CardData, CardData> OnCardCycled;   // (slotIndex, newCardAddedToSlot, nextCardInQueue)

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

        private void Start()
        {
            // Initialize if startingDeck is configured
            if (startingDeck != null && startingDeck.Count == 8)
            {
                InitializeHand(startingDeck);
            }
            else
            {
                Debug.LogWarning("CardHandManager: Starting deck is not configured or does not contain exactly 8 cards!");
            }
        }

        public void InitializeHand(List<CardData> clientDeck)
        {
            battleDeck = new List<CardData>(clientDeck);
            
            // Shuffle
            ShuffleDeck(battleDeck);

            // Populate hand
            for (int i = 0; i < 4; i++)
            {
                activeHand[i] = battleDeck[i];
            }

            // Populate queue
            deckQueue.Clear();
            for (int i = 4; i < battleDeck.Count; i++)
            {
                deckQueue.Enqueue(battleDeck[i]);
            }

            OnHandInitialized?.Invoke(activeHand, GetNextCardPreview());
            Debug.Log("CardHandManager: Battle hand and queue rotation initialized.");
        }

        public CardData GetCardInSlot(int slotIndex)
        {
            if (slotIndex < 0 || slotIndex >= 4) return null;
            return activeHand[slotIndex];
        }

        public CardData GetNextCardPreview()
        {
            if (deckQueue.Count == 0) return null;
            return deckQueue.Peek();
        }

        public void CycleCardSlot(int slotIndex)
        {
            if (slotIndex < 0 || slotIndex >= 4) return;
            if (deckQueue.Count == 0) return;

            CardData deployedCard = activeHand[slotIndex];
            
            // Dequeue next card and place in hand slot
            CardData nextCard = deckQueue.Dequeue();
            activeHand[slotIndex] = nextCard;
            
            // Enqueue the deployed card back to bottom of deck
            deckQueue.Enqueue(deployedCard);

            // Notify listeners (UI slot, next card preview)
            OnCardCycled?.Invoke(slotIndex, nextCard, GetNextCardPreview());
            Debug.Log($"CardHandManager: Cycled slot {slotIndex}. Replaced with {nextCard.CardName}. Next preview: {GetNextCardPreview().CardName}");
        }

        private void ShuffleDeck(List<CardData> list)
        {
            System.Random rnd = new System.Random();
            int n = list.Count;
            while (n > 1)
            {
                n--;
                int k = rnd.Next(n + 1);
                CardData value = list[k];
                list[k] = list[n];
                list[n] = value;
            }
        }
    }
}
