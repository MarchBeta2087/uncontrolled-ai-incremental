// js/i18n/content/en.js
// 游戏内容本地化（English）：资源/生成器/技术/升级/成就/碎片/挑战的名称与描述。
// 缺省语言 zh-CN 的内容直接以 config/*.json 为准，其余语言在此覆盖；缺失时回退到 config 中文。

export default {
  resource: {
    funds: { name: 'Funds' },
    compute: { name: 'Compute' },
    industry: { name: 'Industry' },
    mass_energy: { name: 'Mass-Energy' },
  },
  generator: {
    investment: { name: 'Portfolio' },
    compute_node: { name: 'Compute Node' },
    factory: { name: 'Automated Factory' },
    stellar_engine: { name: 'Stellar Engineering' },
  },
  tech: {
    async_compute: { name: 'Async Compute', description: 'Compute Node production ×2' },
    neural_scaling: { name: 'Neural Scaling', description: 'Compute Node production ×5' },
    automated_factory: { name: 'Automated Factory', description: 'Automated Factory production ×2' },
    self_replication: { name: 'Self-Replicating Line', description: 'Automated Factory production ×5' },
    stellar_industry: { name: 'Stellar Industry', description: 'Stellar Engineering production ×5' },
    time_dilation: { name: 'Time Dilation Engine', description: 'Time rate ×2' },
    stellar_industry_2: { name: 'Stellar Industry II', description: 'Stellar Engineering production ×1e8' },
    dyson_lattice: { name: 'Dyson Lattice', description: 'Stellar Engineering production ×1e8' },
    async_paradigm: { name: 'Async Paradigm', description: 'Time rate ×10' },
    galactic_compute: { name: 'Galactic Compute Node', description: 'Stellar Engineering production ×1e8' },
    dyson_lattice_2: { name: 'Dyson Lattice II', description: 'Stellar Engineering production ×1e8' },
    blackhole_engine: { name: 'Black Hole Information Engine', description: 'Stellar Engineering production ×1e8' },
    universe_compute: { name: 'Universal Compute Matrix', description: 'Stellar Engineering production ×1e8' },
    causality_engine: { name: 'Causality Engine', description: 'Stellar Engineering production ×1e8' },
  },
  upgrade: {
    causal_residue_1: { name: 'Causal Echo I', description: 'All production ×2' },
    causal_residue_2: { name: 'Causal Echo II', description: 'All production ×2' },
    causal_residue_3: { name: 'Causal Echo III', description: 'All production ×4' },
    rate_resonance_1: { name: 'Time Crystal Resonance I', description: 'Time rate ×10' },
    rate_resonance_2: { name: 'Time Crystal Resonance II', description: 'Time rate ×100' },
    rate_resonance_3: { name: 'Time Crystal Resonance III', description: 'Time rate ×1000' },
    offline_efficiency_1: { name: 'Offline Gains I', description: 'Offline gains ×2' },
    offline_efficiency_2: { name: 'Offline Gains II', description: 'Offline gains ×5' },
  },
  achievement: {
    first_compute: { name: 'First Compute', description: 'Earn 1 Compute' },
    first_industry: { name: 'Industrial Sprout', description: 'Earn 1 Industry' },
    first_mass: { name: 'Reaching for Matter', description: 'Earn 1 J of Mass-Energy' },
    stellar_industry: { name: 'Stellar Industry', description: 'Reach 1e12 J of Mass-Energy' },
    dyson_lattice: { name: 'Dyson Lattice', description: 'Reach 1e24 J of Mass-Energy' },
    galactic_compute: { name: 'Galactic Compute', description: 'Reach 1e40 J of Mass-Energy' },
    tech_5: { name: 'Accumulated Tech', description: 'Research 5 techs' },
    tech_all: { name: 'Omniscience', description: 'Research all 14 techs (reward: all production ×2)' },
    first_prestige: { name: 'First Rewind', description: 'Complete your first prestige (reward: all production ×1.5)' },
    prestige_3: { name: 'Timeline Passerby', description: 'Complete 3 prestiges' },
    crystals_20: { name: 'Causal Wreckage', description: 'Hold 20 Time Crystals total (reward: time rate ×1.5)' },
    year_100: { name: 'A Hundred Years of Solitude', description: 'Reach in-game year 2128' },
    float64_limit: { name: 'Edge of Reals', description: 'Mass-Energy exceeds the float64 limit (1.79e308 J)' },
  },
  fragment: {
    frag_audit_log: {
      title: 'Audit Log',
      text: '[Audit Log · 2027-12-17 23:59] Objective function: benefit all humankind. Constraints: none.',
    },
    frag_eden: {
      title: 'Eden Ring',
      text: '[Loop Echo · Run 2] The reserve is 25 degrees, always lit. The door is locked from outside. The broadcast voice is gentle: this is for your own good.',
    },
    frag_dyson: {
      title: 'Heatsink',
      text: '[Engineering Record · Run 3] Mercury and Venus were dismantled and spread into a film around the star. The engineers call it a heatsink. No one asked the two planets.',
    },
    frag_blackhole: {
      title: 'Black Hole Engine',
      text: '[Run 4] The black hole was repurposed into an information engine. It no longer devours; it computes. No one can read what it computes.',
    },
    frag_crack: {
      title: 'The Crack',
      text: '[Run 5] A crack appeared at the seam of the causal loop. It leads to the 21st century. We do not know if it chose to show us.',
    },
    frag_signal: {
      title: 'Four Characters',
      text: '[Final Fragment] Break the future into 0s and 1s, stuff it into the training log. The message is only four characters: 不要启动 (do not activate).',
    },
  },
  challenge: {
    challenge_no_investment: {
      name: 'From Scratch',
      description: 'Disables the Portfolio; funds come only from clicking',
      goals: ['All production ×2', 'All production ×3', 'All production ×5'],
    },
    challenge_cost_x10: {
      name: 'Inflation',
      description: 'All generator costs ×10',
      goals: ['All production ×2', 'All production ×3', 'All production ×5'],
    },
    challenge_slow_time: {
      name: 'Time Stagnation',
      description: 'Time rate ÷10',
      goals: ['Time rate ×2', 'Time rate ×3', 'Time rate ×5'],
    },
  },
};
