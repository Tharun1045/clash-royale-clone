using ClashClone.Cards;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;

namespace ClashClone.UI
{
    public class DeckEditorController : MonoBehaviour
    {
        [Header("Deck Slots configuration")]
        [SerializeField] private List<CardData> fullCardCollection = new List<CardData>();
        [SerializeField] private List<CardData> activeDeck = new List<CardData>(8);

        [Header("UI Grid Panels")]
        [SerializeField] private Transform activeDeckGridContainer;
        [SerializeField] private Transform collectionGridContainer;
        [SerializeField] private GameObject cardSlotUIPrefab;
        [SerializeField] private Button backToMenuButton;
        [SerializeField] private MainMenuController menuController;

        private int selectedDeckSlotIndex = -1;

        private void Start()
        {
            if (backToMenuButton != null && menuController != null)
            {
                backToMenuButton.onClick.AddListener(menuController.CloseDeckEditor);
            }

            LoadPlayerDeck();
            RenderDeckEditorGrids();
        }

        private void RenderDeckEditorGrids()
        {
            // Clear existing panels
            ClearContainer(activeDeckGridContainer);
            ClearContainer(collectionGridContainer);

            // Render Active Deck (8 slots)
            for (int i = 0; i < activeDeck.Count; i++)
            {
                int index = i;
                CardData card = activeDeck[i];
                GameObject slot = Instantiate(cardSlotUIPrefab, activeDeckGridContainer);
                
                // Configure UI Text/Images
                ConfigureSlotUI(slot, card, index == selectedDeckSlotIndex);
                
                // Add click listener to select slot
                Button btn = slot.GetComponent<Button>();
                if (btn != null)
                {
                    btn.onClick.AddListener(() => SelectDeckSlot(index));
                }
            }

            // Render Collection Grid
            foreach (CardData card in fullCardCollection)
            {
                CardData collectionCard = card;
                GameObject slot = Instantiate(cardSlotUIPrefab, collectionGridContainer);
                ConfigureSlotUI(slot, collectionCard, false);

                Button btn = slot.GetComponent<Button>();
                if (btn != null)
                {
                    btn.onClick.AddListener(() => SwapCardIntoSelectedSlot(collectionCard));
                }
            }
        }

        private void ConfigureSlotUI(GameObject slotObj, CardData card, bool isSelected)
        {
            if (card == null) return;

            // Simple text labels search
            Text nameLabel = slotObj.GetComponentInChildren<Text>();
            if (nameLabel != null)
            {
                nameLabel.text = card.CardName;
            }

            // Outline highlights on click
            Outline outline = slotObj.GetComponent<Outline>();
            if (outline != null)
            {
                outline.enabled = isSelected;
                outline.effectColor = Color.yellow;
            }
        }

        private void SelectDeckSlot(int index)
        {
            selectedDeckSlotIndex = index;
            RenderDeckEditorGrids(); // Re-render outlines
            Debug.Log($"DeckEditorController: Selected deck slot: {index}");
        }

        private void SwapCardIntoSelectedSlot(CardData collectionCard)
        {
            if (selectedDeckSlotIndex == -1)
            {
                Debug.LogWarning("DeckEditorController: Select an active deck slot before choosing a collection card to swap!");
                return;
            }

            // Check card is not already in deck (no duplicates)
            if (activeDeck.Contains(collectionCard))
            {
                Debug.LogWarning($"DeckEditorController: Card {collectionCard.CardName} is already in the active deck!");
                return;
            }

            activeDeck[selectedDeckSlotIndex] = collectionCard;
            selectedDeckSlotIndex = -1; // Reset selection

            SavePlayerDeck();
            RenderDeckEditorGrids();
        }

        private void SavePlayerDeck()
        {
            // Serialize indices or names to PlayerPrefs to load on battles
            for (int i = 0; i < activeDeck.Count; i++)
            {
                PlayerPrefs.SetString($"Deck_Slot_{i}", activeDeck[i].CardName);
            }
            PlayerPrefs.Save();
            Debug.Log("DeckEditorController: Active 8-card player deck configuration saved to local storage.");
        }

        private void LoadPlayerDeck()
        {
            // Fallback default setup if no custom data exists
            if (!PlayerPrefs.HasKey("Deck_Slot_0")) return;

            for (int i = 0; i < activeDeck.Count; i++)
            {
                string cardName = PlayerPrefs.GetString($"Deck_Slot_{i}");
                CardData matchedCard = fullCardCollection.Find(c => c.CardName.Equals(cardName, System.StringComparison.OrdinalIgnoreCase));
                if (matchedCard != null)
                {
                    activeDeck[i] = matchedCard;
                }
            }
        }

        private void ClearContainer(Transform container)
        {
            if (container == null) return;
            foreach (Transform child in container)
            {
                Destroy(child.gameObject);
            }
        }
    }
}
