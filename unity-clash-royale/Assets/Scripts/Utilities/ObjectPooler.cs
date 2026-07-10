using System.Collections.Generic;
using UnityEngine;

namespace ClashClone.Utilities
{
    public class ObjectPooler : MonoBehaviour
    {
        public static ObjectPooler Instance { get; private set; }

        [System.Serializable]
        public class Pool
        {
            public string tag;
            public GameObject prefab;
            public int size;
        }

        [SerializeField] private List<Pool> pools = new List<Pool>();
        private Dictionary<string, Queue<GameObject>> poolDictionary = new Dictionary<string, Queue<GameObject>>();

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

            InitializePools();
        }

        private void InitializePools()
        {
            foreach (Pool pool in pools)
            {
                Queue<GameObject> objectPool = new Queue<GameObject>();

                for (int i = 0; i < pool.size; i++)
                {
                    GameObject obj = Instantiate(pool.prefab, transform);
                    obj.SetActive(false);
                    objectPool.Enqueue(obj);
                }

                poolDictionary.Add(pool.tag, objectPool);
                Debug.Log($"ObjectPooler: Pre-warmed pool '{pool.tag}' with {pool.size} items.");
            }
        }

        public GameObject SpawnFromPool(string tag, Vector3 position, Quaternion rotation)
        {
            if (!poolDictionary.ContainsKey(tag))
            {
                Debug.LogWarning($"ObjectPooler: Pool with tag '{tag}' does not exist!");
                return null;
            }

            // Fetch first object
            GameObject objToSpawn = poolDictionary[tag].Dequeue();

            // Re-enqueue it immediately to cycle it
            poolDictionary[tag].Enqueue(objToSpawn);

            objToSpawn.SetActive(true);
            objToSpawn.transform.position = position;
            objToSpawn.transform.rotation = rotation;

            return objToSpawn;
        }

        public void Recycle(string tag, GameObject obj)
        {
            obj.SetActive(false);
            // Optionally reparent to transform to keep hierarchy clean
            obj.transform.SetParent(transform);
        }
    }
}
