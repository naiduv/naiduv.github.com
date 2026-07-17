const TOPICS = [
  "Artificial_intelligence",
  "Technological_singularity",
  "Machine_learning",
  "Deep_learning",
  "Neural_network",
  "Large_language_model",
  "Transformer_(deep_learning_architecture)",
  "Reinforcement_learning",
  "Superintelligence",
  "Turing_test",
  "Moore's_law",
  "Quantum_computing",
  "Cloud_computing",
  "Distributed_computing",
  "Kubernetes",
  "Blockchain",
  "Open_source",
  "Algorithm",
  "P_versus_NP_problem",
  "Information_theory",
  "Cybernetics",
  "Robotics",
  "Computer_vision",
  "Natural_language_processing",
  "Backpropagation",
  "Genetic_algorithm",
  "Transhumanism",
  "Ray_Kurzweil",
  "Existential_risk_from_artificial_general_intelligence",
  "BitTorrent",
  "PostgreSQL",
  "PageRank",
  "Internet",
  "World_Wide_Web",
  "Compiler",
  "Unix",
  "Linux",
  "Git",
  "Microservices",
  "Application_programming_interface",
  "Cryptography",
  "Shannon's_theorem",
  "Floating-point_arithmetic",
  "Electrical_engineering",
  "Software_engineering",
  "Agile_software_development",
  "DevOps",
  "Continuous_integration",
  "Data_structure",
  "Operating_system",
  "Computer_science",
  "Silicon_Valley",
  "Venture_capital",
  "Startup_company",
  "Internet_of_things",
  "Edge_computing",
  "Serverless_computing",
  "Functional_programming",
  "TypeScript",
  "JavaScript",
  "Python_(programming_language)",
  "Go_(programming_language)",
  "Rust_(programming_language)",
  "C++",
  "Tensor_processing_unit",
  "Graphics_processing_unit",
  "Nvidia",
  "OpenAI",
  "ChatGPT",
  "Attention_(machine_learning)",
  "Convolutional_neural_network",
  "Recurrent_neural_network",
  "Bayesian_network",
  "Markov_chain",
  "Entropy_(information_theory)",
  "Halting_problem",
  "Gödel's_incompleteness_theorems",
  "Fuzzy_logic",
  "Expert_system",
  "Knowledge_graph",
  "Semantic_Web",
  "Augmented_reality",
  "Virtual_reality",
  "Brain–computer_interface",
  "Neuroscience",
  "Neuron",
  "Synapse",
  "Action_potential",
  "Neuroplasticity",
  "Connectome",
  "Cerebral_cortex",
  "Hippocampus",
  "Amygdala",
  "Prefrontal_cortex",
  "Default_mode_network",
  "Long-term_potentiation",
  "Memory",
  "Consciousness",
  "Cognitive_neuroscience",
  "Computational_neuroscience",
  "Neuromorphic_engineering",
  "Spiking_neural_network",
  "Neurotransmitter",
  "Dopamine",
  "Optogenetics",
  "Functional_magnetic_resonance_imaging",
  "Electroencephalography",
  "Connectomics",
  "Human_brain",
  "Mirror_neuron",
  "Place_cell",
  "Grid_cell",
  "Hebbian_theory",
  "Neural_coding",
  "Visual_cortex",
  "Sleep",
  "Circadian_rhythm",
  "Human_Connectome_Project",
  "Nanotechnology",
  "Fusion_power",
  "CRISPR",
  "Synthetic_biology",
  "Simulation_hypothesis",
  "Technological_unemployment",
  "Flynn_effect",
  "Metcalfe's_law",
  "CAP_theorem",
  "Byzantine_fault",
  "Consensus_(computer_science)",
  "MapReduce",
  "Elasticsearch",
  "Apache_Kafka",
  "Service-oriented_architecture",
  "REST",
  "GraphQL",
  "OAuth",
  "Zero-knowledge_proof",
  "Homomorphic_encryption",
  "Post-quantum_cryptography",
];

const cache = new Map();
const API = "https://en.wikipedia.org/api/rest_v1/page/summary/";

function truncate(text, max = 300) {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

function pickTopic(excludeTitle) {
  const pool = excludeTitle ? TOPICS.filter((t) => t !== excludeTitle) : TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
}

async function fetchFact(title) {
  if (cache.has(title)) return cache.get(title);

  const response = await fetch(`${API}${encodeURIComponent(title.replace(/ /g, "_"))}`);
  if (!response.ok) throw new Error(`Wikipedia request failed: ${title}`);

  const data = await response.json();
  const fact = {
    title: data.title,
    extract: truncate(data.extract),
    url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${title}`,
  };

  cache.set(title, fact);
  return fact;
}

export async function getRandomFact(excludeSlug) {
  const title = pickTopic(excludeSlug);
  const fact = await fetchFact(title);
  return { ...fact, slug: title };
}

export function prefetchFacts(count = 10) {
  const picks = [...TOPICS].sort(() => Math.random() - 0.5).slice(0, count);
  picks.forEach((title) => {
    if (!cache.has(title)) fetchFact(title).catch(() => {});
  });
}
