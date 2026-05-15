import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowRight,
  Battery,
  BatteryCharging,
  Bolt,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  CloudSun,
  Cpu,
  Database,
  Download,
  Factory,
  FileText,
  Gauge,
  Info,
  Leaf,
  Lightbulb,
  LineChart,
  MapPin,
  PlugZap,
  Save,
  Server,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trash2,
  TrendingUp,
  Upload,
  WalletCards,
  Zap,
} from 'lucide-react'

const initialInputs = {
  city: 'Austin',
  state: 'TX',
  zipCode: '78701',
  monthlyBill: 180,
  monthlyKwh: 1100,
  electricityRate: 0.16,
  roofArea: 650,
  desiredOffset: 80,
  wantsBackup: true,
  backupHours: 8,
  peakLoad: 4.5,
  budget: 'medium',
}

const initialGridInputs = {
  transformerRatingKva: 75,
  currentPeakLoadKw: 58,
  annualLoadGrowthPercent: 3,
  plannedUpgradeCost: 85000,
  batteryDischargePowerKw: 25,
  deferralYears: 3,
}

const budgetProfiles = {
  low: { label: 'Low', costPerWatt: 2.5 },
  medium: { label: 'Medium', costPerWatt: 3 },
  high: { label: 'High', costPerWatt: 3.5 },
}

const chartColors = ['#22c55e', '#38bdf8', '#94a3b8']

const regionProfiles = {
  southwest: {
    label: 'Southwest / high-sun belt',
    states: ['AZ', 'NM', 'NV', 'TX', 'CA'],
    solarResource: 'Very High',
    irradianceCategory: 'Very High',
    baseCapacityFactor: 0.205,
    climateAdjustment: 1.08,
    regionalRate: 0.19,
  },
  southeast: {
    label: 'Southeast / humid solar region',
    states: ['FL', 'GA', 'NC', 'SC', 'AL', 'MS', 'LA', 'TN'],
    solarResource: 'High',
    irradianceCategory: 'High',
    baseCapacityFactor: 0.19,
    climateAdjustment: 1,
    regionalRate: 0.15,
  },
  northeast: {
    label: 'Northeast / mixed seasonal region',
    states: ['NY', 'MA', 'VT', 'ME', 'NH', 'RI', 'CT', 'NJ', 'PA'],
    solarResource: 'Medium',
    irradianceCategory: 'Medium',
    baseCapacityFactor: 0.17,
    climateAdjustment: 0.92,
    regionalRate: 0.24,
  },
  pacificNorthwest: {
    label: 'Pacific Northwest / cloudy coastal region',
    states: ['WA', 'OR'],
    solarResource: 'Low',
    irradianceCategory: 'Low',
    baseCapacityFactor: 0.155,
    climateAdjustment: 0.82,
    regionalRate: 0.13,
  },
  midwest: {
    label: 'Midwest / continental region',
    states: ['IL', 'IN', 'IA', 'KS', 'MI', 'MN', 'MO', 'NE', 'ND', 'OH', 'SD', 'WI'],
    solarResource: 'Medium',
    irradianceCategory: 'Medium',
    baseCapacityFactor: 0.175,
    climateAdjustment: 0.92,
    regionalRate: 0.16,
  },
  default: {
    label: 'General U.S. planning region',
    states: [],
    solarResource: 'Medium',
    irradianceCategory: 'Medium',
    baseCapacityFactor: 0.18,
    climateAdjustment: 0.92,
    regionalRate: 0.17,
  },
}

const batteryOptions = [
  {
    name: 'Small backup',
    capacityKwh: 10,
    costPerKwh: 850,
    useCase: 'Critical loads and short outages',
    notes: 'Good educational fit for lights, networking, controls, and small essential circuits.',
  },
  {
    name: 'Standard home battery',
    capacityKwh: 13.5,
    costPerKwh: 800,
    useCase: 'Typical home backup and solar shifting',
    notes: 'A balanced category for residential resilience without oversizing.',
  },
  {
    name: 'Extended backup',
    capacityKwh: 27,
    costPerKwh: 760,
    useCase: 'Longer backup duration or larger homes',
    notes: 'Better for extended outages, higher peak demand, or more critical circuits.',
  },
  {
    name: 'Commercial battery',
    capacityKwh: 50,
    costPerKwh: 700,
    useCase: 'Small commercial buildings and campus facilities',
    notes: 'Planning category for larger loads, demand management, and non-wires alternative studies.',
  },
]

function clampNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback
}

function formatNumber(value, digits = 0) {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0)
}

function formatCurrency(value, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits,
  }).format(Number.isFinite(value) ? value : 0)
}

function normalizeState(state) {
  return String(state || '').trim().slice(0, 2).toUpperCase()
}

function getLocationProfile(inputs) {
  const stateCode = normalizeState(inputs.state)
  const profile =
    Object.values(regionProfiles).find((region) => region.states.includes(stateCode)) ??
    regionProfiles.default
  const roofArea = clampNumber(inputs.roofArea)

  // Educational solar-resource score: combines regional effective capacity factor
  // with a small roof-area feasibility component. This is deterministic and can
  // later be replaced by NREL irradiance or weather API data.
  const effectiveCapacityFactor = profile.baseCapacityFactor * profile.climateAdjustment
  const capacityScore = (effectiveCapacityFactor / 0.222) * 75
  const roofScore = Math.min(25, (roofArea / 1000) * 25)
  const solarResourceScore = Math.max(1, Math.min(100, Math.round(capacityScore + roofScore)))
  const scoreCategory =
    solarResourceScore >= 82
      ? 'Very High'
      : solarResourceScore >= 68
        ? 'High'
        : solarResourceScore >= 48
          ? 'Medium'
          : 'Low'

  return {
    ...profile,
    stateCode: stateCode || 'US',
    zipCode: String(inputs.zipCode || '').trim() || 'Not provided',
    effectiveCapacityFactor,
    solarResourceScore,
    scoreCategory,
  }
}

function calculateEnergyPlan(inputs) {
  const monthlyBill = clampNumber(inputs.monthlyBill)
  const monthlyKwh = clampNumber(inputs.monthlyKwh)
  const userElectricityRate = clampNumber(inputs.electricityRate)
  const locationProfile = getLocationProfile(inputs)
  const rateUsed = userElectricityRate > 0 ? userElectricityRate : locationProfile.regionalRate
  const roofArea = clampNumber(inputs.roofArea)
  const desiredOffset = Math.min(clampNumber(inputs.desiredOffset), 100)
  const backupHours = clampNumber(inputs.backupHours)
  const peakLoad = clampNumber(inputs.peakLoad)
  const budget = budgetProfiles[inputs.budget] ?? budgetProfiles.medium

  // Simplified engineering assumptions for early planning:
  // a regional base solar capacity factor, a weather/climate adjustment, 18 W/sq ft
  // panel density, and annual production = system size kW x 8760 x effective capacity factor.
  const capacityFactor = locationProfile.baseCapacityFactor
  const effectiveCapacityFactor = locationProfile.effectiveCapacityFactor
  const panelWattsPerSquareFoot = 18
  const co2PoundsPerKwh = 0.855
  const batteryCostPerKwh = 700
  const otherProjectCostRate = 0.08

  const annualUsage = monthlyKwh * 12
  const annualBillCost = monthlyBill * 12
  const annualEnergyCost = annualUsage * rateUsed
  const utilityAnnualCostImpact = annualUsage * rateUsed
  const annualKwhTarget = annualUsage * (desiredOffset / 100)
  const requiredSolarSizeKw = annualKwhTarget / (8760 * effectiveCapacityFactor)
  const roofLimitedMaxSolarKw = (roofArea * panelWattsPerSquareFoot) / 1000
  const recommendedSolarSizeKw = Math.min(requiredSolarSizeKw, roofLimitedMaxSolarKw)
  const annualSolarProduction = recommendedSolarSizeKw * 8760 * effectiveCapacityFactor
  const solarKwhUsed = Math.min(annualSolarProduction, annualUsage)
  const yearlySolarSavings = solarKwhUsed * rateUsed
  const tenYearSavings = yearlySolarSavings * 10
  const co2ReductionTons = (solarKwhUsed * co2PoundsPerKwh) / 2000
  const batterySizeKwh = inputs.wantsBackup ? peakLoad * backupHours : 0
  const solarCost = recommendedSolarSizeKw * budget.costPerWatt * 1000
  const batteryCost = batterySizeKwh * batteryCostPerKwh
  const otherProjectCost = (solarCost + batteryCost) * otherProjectCostRate
  const totalProjectCost = solarCost + batteryCost + otherProjectCost
  const annualCoveragePercent = annualUsage > 0 ? (solarKwhUsed / annualUsage) * 100 : 0
  const roofAreaEnough = roofLimitedMaxSolarKw >= requiredSolarSizeKw
  const gridEnergyRemaining = Math.max(annualUsage - solarKwhUsed, 0)
  const paybackPeriodYears = yearlySolarSavings > 0 ? solarCost / yearlySolarSavings : Infinity

  return {
    annualUsage,
    annualEnergyCost,
    annualKwhTarget,
    requiredSolarSizeKw,
    roofLimitedMaxSolarKw,
    recommendedSolarSizeKw,
    annualSolarProduction,
    solarKwhUsed,
    yearlySolarSavings,
    tenYearSavings,
    co2ReductionTons,
    batterySizeKwh,
    batteryCost,
    solarCost,
    otherProjectCost,
    totalProjectCost,
    annualCoveragePercent,
    roofAreaEnough,
    gridEnergyRemaining,
    paybackPeriodYears,
    budget,
    annualBillCost,
    userElectricityRate,
    regionalRate: locationProfile.regionalRate,
    rateUsed,
    utilityAnnualCostImpact,
    capacityFactor,
    effectiveCapacityFactor,
    climateAdjustment: locationProfile.climateAdjustment,
    locationProfile,
  }
}

function analyzeGridDeferral(gridInputs) {
  const transformerRatingKva = clampNumber(gridInputs.transformerRatingKva)
  const currentPeakLoadKw = clampNumber(gridInputs.currentPeakLoadKw)
  const annualLoadGrowthPercent = clampNumber(gridInputs.annualLoadGrowthPercent)
  const plannedUpgradeCost = clampNumber(gridInputs.plannedUpgradeCost)
  const batteryDischargePowerKw = clampNumber(gridInputs.batteryDischargePowerKw)
  const deferralYears = Math.max(1, Math.round(clampNumber(gridInputs.deferralYears, 1)))

  // Simplified distribution-planning model:
  // transformer kVA is converted to approximate kW using 0.9 power factor,
  // future peak is grown geometrically, and BESS discharge is treated as peak shaving.
  const powerFactor = 0.9
  const discountRate = 0.07
  const transformerCapacityKw = transformerRatingKva * powerFactor
  const futurePeakLoadKw = currentPeakLoadKw * (1 + annualLoadGrowthPercent / 100) ** deferralYears
  const peakAfterBessKw = Math.max(futurePeakLoadKw - batteryDischargePowerKw, 0)
  const currentLoadingPercent =
    transformerCapacityKw > 0 ? (currentPeakLoadKw / transformerCapacityKw) * 100 : 0
  const futureLoadingPercent =
    transformerCapacityKw > 0 ? (futurePeakLoadKw / transformerCapacityKw) * 100 : 0
  const afterBessLoadingPercent =
    transformerCapacityKw > 0 ? (peakAfterBessKw / transformerCapacityKw) * 100 : 0
  const overloadAvoided = futurePeakLoadKw > transformerCapacityKw && peakAfterBessKw <= transformerCapacityKw
  const reducesOverload = futurePeakLoadKw > transformerCapacityKw && peakAfterBessKw < futurePeakLoadKw
  const deferralValue =
    plannedUpgradeCost - plannedUpgradeCost / (1 + discountRate) ** deferralYears
  const feasibility = overloadAvoided
    ? 'High'
    : reducesOverload || afterBessLoadingPercent <= 100
      ? 'Medium'
      : 'Low'

  return {
    transformerCapacityKw,
    currentLoadingPercent,
    futurePeakLoadKw,
    futureLoadingPercent,
    peakAfterBessKw,
    afterBessLoadingPercent,
    overloadAvoided,
    deferralValue,
    feasibility,
    powerFactor,
    discountRate,
  }
}

function getBatteryComparison(requiredBatteryKwh) {
  const recommended =
    batteryOptions.find((option) => requiredBatteryKwh <= option.capacityKwh) ??
    batteryOptions[batteryOptions.length - 1]

  return batteryOptions.map((option) => ({
    ...option,
    estimatedInstalledCost: option.capacityKwh * option.costPerKwh,
    canMeet: requiredBatteryKwh <= option.capacityKwh || option.name === 'Commercial battery',
    recommended: option.name === recommended.name,
  }))
}

function createPlanningReport(inputs, results, recommendation, gridInputs, gridAnalysis) {
  const generatedAt = new Date().toLocaleString()

  return `GridWise Planning Report
Generated: ${generatedAt}

Project
- Location: ${inputs.city}, ${inputs.state} ${inputs.zipCode}
- Recommended strategy: ${recommendation.title}
- Confidence: ${recommendation.confidence}

User Inputs
- Monthly electricity bill: ${formatCurrency(inputs.monthlyBill)}
- Monthly usage: ${formatNumber(inputs.monthlyKwh)} kWh
- Electricity rate entered: ${
    results.userElectricityRate > 0
      ? `${formatCurrency(results.userElectricityRate, 2)}/kWh`
      : 'Regional estimate used'
  }
- Roof area: ${formatNumber(inputs.roofArea)} sq ft
- Desired energy offset: ${inputs.desiredOffset}%
- Backup requested: ${inputs.wantsBackup ? 'Yes' : 'No'}
- Backup duration: ${inputs.backupHours} hours
- Peak load: ${inputs.peakLoad} kW
- Budget: ${results.budget.label}

Location Energy Profile
- Region: ${results.locationProfile.label}
- Solar resource: ${results.locationProfile.solarResource}
- Solar resource score: ${results.locationProfile.solarResourceScore}/100
- Climate adjustment factor: ${formatNumber(results.climateAdjustment, 2)}x
- Regional electricity rate estimate: ${formatCurrency(results.regionalRate, 2)}/kWh
- Rate used in calculations: ${formatCurrency(results.rateUsed, 2)}/kWh

Solar and Cost Results
- Recommended solar size: ${formatNumber(results.recommendedSolarSizeKw, 1)} kW
- Roof-limited max solar size: ${formatNumber(results.roofLimitedMaxSolarKw, 1)} kW
- Annual solar production: ${formatNumber(results.annualSolarProduction)} kWh
- Annual usage covered by solar: ${formatNumber(results.annualCoveragePercent, 0)}%
- Grid energy remaining: ${formatNumber(results.gridEnergyRemaining)} kWh/year
- Annual savings: ${formatCurrency(results.yearlySolarSavings)}
- 10-year savings: ${formatCurrency(results.tenYearSavings)}
- Total estimated project cost: ${formatCurrency(results.totalProjectCost)}
- Simple payback: ${
    Number.isFinite(results.paybackPeriodYears)
      ? `${formatNumber(results.paybackPeriodYears, 1)} years`
      : 'N/A'
  }
- CO2 reduction: ${formatNumber(results.co2ReductionTons, 1)} tons/year

Battery Estimate
- Estimated battery size: ${formatNumber(results.batterySizeKwh, 1)} kWh
- Estimated battery cost: ${formatCurrency(results.batteryCost)}

Grid / BESS Deferral Analysis
- Transformer rating: ${formatNumber(gridInputs.transformerRatingKva)} kVA
- Transformer capacity: ${formatNumber(gridAnalysis.transformerCapacityKw, 1)} kW
- Current loading: ${formatNumber(gridAnalysis.currentLoadingPercent, 0)}%
- Future loading: ${formatNumber(gridAnalysis.futureLoadingPercent, 0)}%
- Peak after BESS support: ${formatNumber(gridAnalysis.peakAfterBessKw, 1)} kW
- Overload avoided: ${gridAnalysis.overloadAvoided ? 'Yes' : 'No'}
- Estimated deferral value: ${formatCurrency(gridAnalysis.deferralValue)}
- Deferral feasibility: ${gridAnalysis.feasibility}

Charts Summary
- Cost chart compares grid-only cumulative cost with the renewable scenario.
- Energy chart compares solar-supplied energy with remaining grid energy.
- Cost breakdown chart separates solar, battery, and other estimated project costs.

Assumptions and Disclaimer
- Regional capacity factor and weather assumptions are simplified internal estimates.
- Solar panel density is approximated at 18 W/sq ft.
- CO2 reduction uses 0.855 lb CO2 avoided per solar kWh.
- Battery and BESS calculations are planning estimates only.
- This report is educational and not a stamped engineering design, utility study, or financial quote.
`
}

function buildRecommendation(inputs, results) {
  const highUsage = results.annualUsage > 15000
  const lowSolarCoverage = results.annualCoveragePercent < 50
  const paybackTooLong = results.paybackPeriodYears > 16
  const paybackReasonable = results.paybackPeriodYears <= 12

  if (highUsage && (!results.roofAreaEnough || paybackTooLong)) {
    return {
      title: 'Energy Efficiency First',
      icon: Lightbulb,
      confidence: 'Medium',
      tone: 'amber',
      explanation:
        'Reduce demand before sizing generation so the future solar or storage system is smaller, cheaper, and easier to justify.',
      reasons: [
        'Annual consumption is high for the available solar area.',
        'The desired offset may be roof-limited or slow to pay back.',
        'Efficiency upgrades can lower peak load and improve every later option.',
      ],
      nextStep: 'Complete an energy audit, then rerun GridWise with updated usage.',
    }
  }

  if (inputs.wantsBackup && (!results.roofAreaEnough || lowSolarCoverage)) {
    return {
      title: 'Battery Backup Focus',
      icon: ShieldCheck,
      confidence: 'Medium',
      tone: 'blue',
      explanation:
        'Prioritize resilient backup for critical loads, then add solar where the roof can support meaningful production.',
      reasons: [
        'Backup power is requested for the site.',
        'Solar coverage is below the 50% threshold for a full solar-plus-storage plan.',
        'Battery sizing can be matched to the peak load and backup duration.',
      ],
      nextStep: 'Identify critical circuits and refine peak-load assumptions.',
    }
  }

  if (inputs.wantsBackup && results.annualCoveragePercent >= 50 && inputs.budget !== 'low') {
    return {
      title: 'Solar + Battery',
      icon: BatteryCharging,
      confidence: results.roofAreaEnough ? 'High' : 'Medium',
      tone: 'green',
      explanation:
        'The site has enough solar potential to support clean generation while storage adds resilience during outages.',
      reasons: [
        'Backup power is part of the project goal.',
        'Solar can cover at least half of annual usage.',
        'The selected budget can support storage integration.',
      ],
      nextStep: 'Compare battery products and decide which loads need backup.',
    }
  }

  if (!inputs.wantsBackup && results.roofAreaEnough && paybackReasonable) {
    return {
      title: 'Solar Only',
      icon: Sun,
      confidence: 'High',
      tone: 'green',
      explanation:
        'A solar-only design fits the roof constraint and produces useful savings without adding battery complexity.',
      reasons: [
        'Backup power is not required.',
        'Available roof area supports the desired offset.',
        'Estimated payback is within a reasonable planning window.',
      ],
      nextStep: 'Request solar quotes and verify roof orientation, shading, and interconnection rules.',
    }
  }

  return {
    title: results.roofAreaEnough ? 'Solar Only' : 'Energy Efficiency First',
    icon: results.roofAreaEnough ? Sun : Lightbulb,
    confidence: 'Low',
    tone: results.roofAreaEnough ? 'green' : 'amber',
    explanation:
      'The project has potential, but the current inputs suggest a more detailed review before selecting equipment.',
    reasons: [
      'Savings depend strongly on the electricity rate and final installed cost.',
      'Roof area and load assumptions should be verified.',
      'A refined design can improve confidence in the financial result.',
    ],
    nextStep: 'Validate utility bills, roof layout, and local incentives before moving to quotes.',
  }
}

function createCostComparison(results) {
  return Array.from({ length: 11 }, (_, year) => ({
    year: `Year ${year}`,
    'Grid only': Math.round(results.annualEnergyCost * year),
    'Renewable scenario': Math.round(
      results.totalProjectCost + (results.annualEnergyCost - results.yearlySolarSavings) * year,
    ),
  }))
}

function getEngineeringNote(recommendation, results) {
  return `${recommendation.title} was selected from roof capacity, requested backup power, solar coverage of ${formatNumber(
    results.annualCoveragePercent,
    0,
  )}%, and a simple payback estimate of ${
    Number.isFinite(results.paybackPeriodYears)
      ? `${formatNumber(results.paybackPeriodYears, 1)} years`
      : 'not available'
  }.`
}

function SectionIntro({ eyebrow, title, children }) {
  return (
    <div className="section-heading">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      {children && <span>{children}</span>}
    </div>
  )
}

function Field({ label, helper, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      <small>{helper}</small>
    </label>
  )
}

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="input-group-card">
      <div className="input-group-heading">
        <div className="icon-shell">
          <Icon size={20} />
        </div>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  )
}

function MetricCard({ icon: Icon, label, value, unit, helper, accent = 'green' }) {
  return (
    <article className={`metric-card ${accent}`}>
      <div className="metric-topline">
        <div className="icon-shell compact">
          <Icon size={18} />
        </div>
        {unit && <span>{unit}</span>}
      </div>
      <p className="metric-label">{label}</p>
      <p className="metric-value">{value}</p>
      <p className="metric-helper">{helper}</p>
    </article>
  )
}

function HeroVisual({ results }) {
  const floatingMetrics = [
    {
      label: 'Solar potential',
      value: `${formatNumber(results.annualCoveragePercent, 0)}%`,
      icon: Sun,
    },
    {
      label: 'Battery backup',
      value: `${formatNumber(results.batterySizeKwh, 1)} kWh`,
      icon: BatteryCharging,
    },
    {
      label: 'Payback estimate',
      value:
        Number.isFinite(results.paybackPeriodYears) && results.paybackPeriodYears < 100
          ? `${formatNumber(results.paybackPeriodYears, 1)} yrs`
          : 'N/A',
      icon: CircleDollarSign,
    },
    {
      label: 'Carbon reduction',
      value: `${formatNumber(results.co2ReductionTons, 1)} tons`,
      icon: Leaf,
    },
  ]

  return (
    <div className="hero-visual" aria-label="Futuristic energy dashboard preview">
      <div className="hero-visual-grid" />
      <div className="energy-flow horizontal" />
      <div className="energy-flow vertical" />

      <div className="control-panel main-panel">
        <div className="panel-header">
          <div>
            <p>GridWise Platform</p>
            <h3>Clean Energy Scenario</h3>
          </div>
          <span>Live</span>
        </div>
        <div className="solar-array" aria-hidden="true">
          {Array.from({ length: 18 }, (_, index) => (
            <span key={index} />
          ))}
        </div>
        <div className="control-readouts">
          <div>
            <span>Solar potential</span>
            <strong>{formatNumber(results.recommendedSolarSizeKw, 1)} kW</strong>
          </div>
          <div>
            <span>Grid impact</span>
            <strong>{formatCurrency(results.totalProjectCost)}</strong>
          </div>
        </div>
      </div>

      {floatingMetrics.map((metric, index) => {
        const Icon = metric.icon

        return (
          <div className={`floating-metric metric-${index + 1}`} key={metric.label}>
            <Icon size={16} />
            <div>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          </div>
        )
      })}

      <div className="grid-node node-a" />
      <div className="grid-node node-b" />
      <div className="grid-node node-c" />
    </div>
  )
}

function Hero({ results }) {
  const highlights = [
    {
      icon: Sun,
      title: 'Solar sizing',
      text: `${formatNumber(results.recommendedSolarSizeKw, 1)} kW preliminary PV system`,
    },
    {
      icon: Battery,
      title: 'Battery backup estimate',
      text: `${formatNumber(results.batterySizeKwh, 1)} kWh storage target`,
    },
    {
      icon: Leaf,
      title: 'CO2 reduction analysis',
      text: `${formatNumber(results.co2ReductionTons, 1)} tons avoided per year`,
    },
  ]

  return (
    <section className="hero-section">
      <div className="hero-circuit-layer" />
      <nav className="top-nav app-container" aria-label="Primary navigation">
        <a className="brand-mark" href="#top">
          <span>
            <Zap size={18} />
          </span>
          GridWise
        </a>
        <div className="nav-links">
          <a href="#impact">Impact</a>
          <a href="#planner">Inputs</a>
          <a href="#recommendation">Recommendation</a>
          <a href="#grid-impact">Grid Impact</a>
          <a href="#scenarios">Report</a>
          <a href="#analytics">Analytics</a>
          <a href="#employers">Employers</a>
        </div>
      </nav>

      <div className="app-container hero-grid" id="top">
        <div className="hero-copy">
          <div className="hero-badges">
            <span>
              <Sparkles size={15} />
              Clean energy decision support
            </span>
            <span>
              <Cpu size={15} />
              Solar · storage · grid resilience
            </span>
          </div>
          <p className="hero-kicker">Clean Energy Planning Platform</p>
          <h1>GridWise</h1>
          <h2>
            A decision-support platform for solar, battery storage, and grid resilience.
          </h2>
          <p className="hero-description">
            GridWise helps users make smarter clean-energy decisions by turning building energy data
            into solar, battery storage, cost, carbon, and grid-impact insights.
          </p>
          <p className="hero-description secondary">
            The platform is designed to make early-stage renewable energy planning more accessible
            for homeowners, small businesses, campuses, and communities before they invest in
            expensive studies or equipment.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#planner">
              Launch planner
              <ArrowRight size={18} />
            </a>
            <a className="secondary-button" href="#impact">
              Why it matters
            </a>
          </div>
        </div>

        <HeroVisual results={results} />
      </div>

      <div className="app-container hero-highlights">
        {highlights.map((highlight) => {
          const Icon = highlight.icon

          return (
            <article className="highlight-chip" key={highlight.title}>
              <div className="icon-shell compact">
                <Icon size={17} />
              </div>
              <div>
                <h3>{highlight.title}</h3>
                <p>{highlight.text}</p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function LocationEnergyProfile({ results }) {
  const { locationProfile } = results

  return (
    <div className="profile-grid">
      <article className="advanced-card location-profile-card">
        <div className="mini-card-heading">
          <CloudSun size={18} />
          <div>
            <h4>Location Energy Profile</h4>
            <p>Internal regional assumptions for early planning.</p>
          </div>
        </div>
        <div className="data-list">
          <div>
            <span>ZIP code</span>
            <strong>{locationProfile.zipCode}</strong>
          </div>
          <div>
            <span>State / region</span>
            <strong>
              {locationProfile.stateCode} · {locationProfile.label}
            </strong>
          </div>
          <div>
            <span>Estimated solar resource</span>
            <strong>{locationProfile.solarResource}</strong>
          </div>
          <div>
            <span>Climate adjustment factor</span>
            <strong>{formatNumber(results.climateAdjustment, 2)}x</strong>
          </div>
          <div>
            <span>Estimated regional rate</span>
            <strong>{formatCurrency(results.regionalRate, 2)}/kWh</strong>
          </div>
        </div>
        <p className="profile-note">
          Educational estimates only. A future version can replace these assumptions with NREL,
          utility-rate, and weather API data.
        </p>
      </article>

      <article className="advanced-card location-profile-card">
        <div className="mini-card-heading">
          <CircleDollarSign size={18} />
          <div>
            <h4>Utility Rate Intelligence</h4>
            <p>Uses your rate when available; otherwise applies the regional estimate.</p>
          </div>
        </div>
        <div className="data-list">
          <div>
            <span>User entered rate</span>
            <strong>
              {results.userElectricityRate > 0
                ? `${formatCurrency(results.userElectricityRate, 2)}/kWh`
                : 'Not provided'}
            </strong>
          </div>
          <div>
            <span>Estimated regional rate</span>
            <strong>{formatCurrency(results.regionalRate, 2)}/kWh</strong>
          </div>
          <div>
            <span>Rate used in calculations</span>
            <strong>{formatCurrency(results.rateUsed, 2)}/kWh</strong>
          </div>
          <div>
            <span>Annual cost impact</span>
            <strong>{formatCurrency(results.utilityAnnualCostImpact)}</strong>
          </div>
        </div>
      </article>
    </div>
  )
}

function SolarResourcePanel({ results }) {
  return (
    <article className="advanced-card score-card">
      <div className="score-ring" style={{ '--score': `${results.locationProfile.solarResourceScore}%` }}>
        <strong>{results.locationProfile.solarResourceScore}</strong>
        <span>/100</span>
      </div>
      <div>
        <p className="advanced-eyebrow">Solar Irradiance Estimator</p>
        <h3>Solar Resource Score</h3>
        <p>
          Category: <strong>{results.locationProfile.scoreCategory}</strong>. Capacity factor used:{' '}
          <strong>{formatNumber(results.effectiveCapacityFactor * 100, 1)}%</strong>.
        </p>
        <p>
          The adjusted capacity factor combines regional solar resource and climate assumptions, then
          directly changes annual production and required PV size.
        </p>
      </div>
    </article>
  )
}

function InputForm({ inputs, setInputs, results }) {
  const updateInput = (field, value) => {
    setInputs((current) => ({ ...current, [field]: value }))
  }

  const updateNumber = (field, value) => {
    updateInput(field, clampNumber(value))
  }

  return (
    <div className="input-panel">
      <div className="planner-note">
        <Info size={18} />
        <p>This tool uses simplified assumptions for early-stage planning and education.</p>
      </div>

      <div className="input-card-grid">
        <SectionCard
          icon={MapPin}
          title="Location"
          subtitle="Label the planning case and prepare the workflow for future weather and irradiance data."
        >
          <div className="form-grid three">
            <Field label="City or location name" helper="Example: Austin, Boston, Campus Building A">
              <input
                className="input"
                value={inputs.city}
                placeholder="Austin"
                onChange={(event) => updateInput('city', event.target.value)}
              />
            </Field>
            <Field label="State" helper="Use the state abbreviation or full state name.">
              <input
                className="input"
                value={inputs.state}
                placeholder="TX"
                onChange={(event) => updateInput('state', event.target.value)}
              />
            </Field>
            <Field label="ZIP code" helper="Used by the internal profile model and future API-ready workflow.">
              <input
                className="input"
                inputMode="numeric"
                value={inputs.zipCode}
                placeholder="78701"
                onChange={(event) => updateInput('zipCode', event.target.value)}
              />
            </Field>
          </div>
          <LocationEnergyProfile results={results} />
        </SectionCard>

        <SectionCard
          icon={Gauge}
          title="Energy Usage"
          subtitle="Utility bill, kWh consumption, and rate assumptions define the savings model."
        >
          <div className="form-grid three">
            <Field label="Monthly electricity bill" helper="Dollars per month from a recent utility bill.">
              <input
                className="input"
                min="0"
                type="number"
                value={inputs.monthlyBill}
                placeholder="180"
                onChange={(event) => updateNumber('monthlyBill', event.target.value)}
              />
            </Field>
            <Field label="Monthly electricity usage" helper="Energy consumed per month in kWh.">
              <input
                className="input"
                min="0"
                type="number"
                value={inputs.monthlyKwh}
                placeholder="1100"
                onChange={(event) => updateNumber('monthlyKwh', event.target.value)}
              />
            </Field>
            <Field label="Electricity rate" helper="Dollars per kWh; enter 0 to use the regional estimate.">
              <input
                className="input"
                min="0"
                step="0.01"
                type="number"
                value={inputs.electricityRate}
                placeholder="0.16"
                onChange={(event) => updateNumber('electricityRate', event.target.value)}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={Sun}
          title="Solar Potential"
          subtitle="Roof area and target energy offset estimate the feasible PV system size."
        >
          <div className="form-grid two">
            <Field label="Available roof area" helper="Usable square feet after obstructions and setbacks.">
              <input
                className="input"
                min="0"
                type="number"
                value={inputs.roofArea}
                placeholder="650"
                onChange={(event) => updateNumber('roofArea', event.target.value)}
              />
            </Field>
            <Field
              label={`Desired energy offset: ${inputs.desiredOffset}%`}
              helper="Percentage of annual usage targeted for solar generation."
            >
              <input
                className="range"
                min="0"
                max="100"
                type="range"
                value={inputs.desiredOffset}
                onChange={(event) => updateNumber('desiredOffset', event.target.value)}
              />
              <div className="range-scale" aria-hidden="true">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={CloudSun}
          title="Solar Irradiance Estimator"
          subtitle="Regional solar resource and weather assumptions modify production instead of using one fixed national value."
        >
          <SolarResourcePanel results={results} />
        </SectionCard>

        <SectionCard
          icon={Battery}
          title="Battery Backup"
          subtitle="Storage is estimated from peak load multiplied by desired backup duration."
        >
          <div className="form-grid three">
            <Field label="Backup power" helper="Choose yes when outage resilience is part of the goal.">
              <div className="segmented-control">
                <button
                  className={inputs.wantsBackup ? 'active' : ''}
                  type="button"
                  onClick={() => updateInput('wantsBackup', true)}
                >
                  Yes
                </button>
                <button
                  className={!inputs.wantsBackup ? 'active' : ''}
                  type="button"
                  onClick={() => updateInput('wantsBackup', false)}
                >
                  No
                </button>
              </div>
            </Field>
            <Field label="Estimated peak load" helper="Critical or whole-site peak load in kW.">
              <input
                className="input"
                min="0"
                step="0.1"
                type="number"
                value={inputs.peakLoad}
                placeholder="4.5"
                onChange={(event) => updateNumber('peakLoad', event.target.value)}
              />
            </Field>
            {inputs.wantsBackup && (
              <Field label="Backup duration desired" helper="Hours of backup for the selected peak load.">
                <input
                  className="input"
                  min="0"
                  step="1"
                  type="number"
                  value={inputs.backupHours}
                  placeholder="8"
                  onChange={(event) => updateNumber('backupHours', event.target.value)}
                />
              </Field>
            )}
          </div>
        </SectionCard>

        <SectionCard
          icon={WalletCards}
          title="Budget"
          subtitle="Budget controls the installed solar cost-per-watt assumption."
        >
          <div className="segmented-control three budget-control">
            {Object.entries(budgetProfiles).map(([key, profile]) => (
              <button
                className={inputs.budget === key ? 'active' : ''}
                key={key}
                type="button"
                onClick={() => updateInput('budget', key)}
              >
                <strong>{profile.label}</strong>
                <span>{formatCurrency(profile.costPerWatt, 2)}/W</span>
              </button>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function RecommendationCard({ recommendation, inputs, results }) {
  const Icon = recommendation.icon
  const note = getEngineeringNote(recommendation, results)

  return (
    <section className={`recommendation-card ${recommendation.tone}`} id="recommendation">
      <div className="recommendation-glow" />
      <div className="recommendation-content">
        <div className="recommendation-header">
          <div className="recommendation-title-block">
            <div className="recommendation-icon">
              <Icon size={30} />
            </div>
            <div>
              <p>Recommendation Summary</p>
              <h2>Recommended Strategy: {recommendation.title}</h2>
              <span>{recommendation.explanation}</span>
            </div>
          </div>
          <div className="confidence-badge">
            <span>Confidence</span>
            <strong>{recommendation.confidence}</strong>
          </div>
        </div>

        <div className="recommendation-body">
          <div className="reason-grid">
            {recommendation.reasons.map((reason) => (
              <div className="reason-card" key={reason}>
                <CheckCircle2 size={18} />
                <p>{reason}</p>
              </div>
            ))}
          </div>
          <div className="next-step-card">
            <p>Suggested next step</p>
            <h3>{recommendation.nextStep}</h3>
            <div className="scenario-meta">
              <div>
                <span>Site</span>
                <strong>
                  {inputs.city}, {inputs.state}
                </strong>
              </div>
              <div>
                <span>Roof capacity</span>
                <strong>{results.roofAreaEnough ? 'Supports target' : 'Constrained'}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="engineering-note">
          <Activity size={18} />
          <p>{note}</p>
        </div>
      </div>
    </section>
  )
}

function ExecutiveSummary({ recommendation, results, gridAnalysis }) {
  const payback =
    Number.isFinite(results.paybackPeriodYears) && results.paybackPeriodYears < 100
      ? `${formatNumber(results.paybackPeriodYears, 1)} years`
      : 'N/A'
  const summaryItems = [
    { label: 'Recommended strategy', value: recommendation.title, icon: Target },
    {
      label: 'Solar resource score',
      value: `${results.locationProfile.solarResourceScore}/100`,
      icon: CloudSun,
    },
    { label: 'Estimated project cost', value: formatCurrency(results.totalProjectCost), icon: WalletCards },
    { label: 'Payback period', value: payback, icon: Clock3 },
    { label: 'Annual savings', value: formatCurrency(results.yearlySolarSavings), icon: CircleDollarSign },
    {
      label: 'CO2 reduction',
      value: `${formatNumber(results.co2ReductionTons, 1)} tons/yr`,
      icon: Leaf,
    },
    { label: 'BESS deferral feasibility', value: gridAnalysis.feasibility, icon: PlugZap },
  ]

  return (
    <section className="executive-summary">
      <div className="summary-header">
        <div>
          <p>Advanced Dashboard Summary</p>
          <h2>Energy Planning Output</h2>
        </div>
        <span>Engineering-style screening result</span>
      </div>
      <div className="summary-grid">
        {summaryItems.map((item) => {
          const Icon = item.icon

          return (
            <article className="summary-tile" key={item.label}>
              <Icon size={18} />
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function BatteryStorageOptions({ requiredBatteryKwh }) {
  const comparison = getBatteryComparison(requiredBatteryKwh)
  const recommended = comparison.find((option) => option.recommended)

  return (
    <section className="section-panel" id="storage-options">
      <SectionIntro eyebrow="Battery Storage Options" title="Storage Category Comparison">
        Compare generic battery system categories against the requested backup duration. Costs are
        simplified educational estimates, not product quotes.
      </SectionIntro>
      <div className="storage-callout">
        <BatteryCharging size={22} />
        <div>
          <p>Estimated required battery size</p>
          <h3>
            {formatNumber(requiredBatteryKwh, 1)} kWh · Suggested category:{' '}
            {recommended?.name ?? 'Custom battery bank'}
          </h3>
        </div>
      </div>
      <div className="table-wrap">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Battery option</th>
              <th>Usable capacity</th>
              <th>Estimated installed cost</th>
              <th>Best use case</th>
              <th>Meets backup?</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {comparison.map((option) => (
              <tr className={option.recommended ? 'recommended-row' : ''} key={option.name}>
                <td>
                  <strong>{option.name}</strong>
                  {option.recommended && <span>Recommended fit</span>}
                </td>
                <td>{option.name === 'Commercial battery' ? '50+ kWh' : `${option.capacityKwh} kWh`}</td>
                <td>{formatCurrency(option.estimatedInstalledCost)}</td>
                <td>{option.useCase}</td>
                <td>{option.canMeet ? 'Yes' : 'No'}</td>
                <td>{option.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function GridDeferralSection({ gridInputs, setGridInputs, gridAnalysis }) {
  const updateGridInput = (field, value) => {
    setGridInputs((current) => ({ ...current, [field]: clampNumber(value) }))
  }

  const metrics = [
    {
      icon: Server,
      label: 'Transformer capacity',
      value: formatNumber(gridAnalysis.transformerCapacityKw, 1),
      unit: 'kW',
      helper: 'Transformer kVA converted to approximate kW using 0.9 power factor.',
      accent: 'blue',
    },
    {
      icon: Gauge,
      label: 'Current loading',
      value: formatNumber(gridAnalysis.currentLoadingPercent, 0),
      unit: '%',
      helper: 'Current peak load divided by estimated transformer kW capacity.',
      accent: 'slate',
    },
    {
      icon: TrendingUp,
      label: 'Future loading',
      value: formatNumber(gridAnalysis.futureLoadingPercent, 0),
      unit: '%',
      helper: `Projected after ${gridInputs.deferralYears} year(s) of load growth.`,
      accent: 'amber',
    },
    {
      icon: BatteryCharging,
      label: 'Peak after BESS support',
      value: formatNumber(gridAnalysis.peakAfterBessKw, 1),
      unit: 'kW',
      helper: 'Projected peak minus planned battery discharge power.',
      accent: 'cyan',
    },
    {
      icon: ShieldCheck,
      label: 'Overload avoided',
      value: gridAnalysis.overloadAvoided ? 'Yes' : 'No',
      unit: '',
      helper: 'Checks whether BESS peak shaving brings projected loading below capacity.',
      accent: gridAnalysis.overloadAvoided ? 'green' : 'amber',
    },
    {
      icon: CircleDollarSign,
      label: 'Estimated deferral value',
      value: formatCurrency(gridAnalysis.deferralValue),
      unit: 'PV',
      helper: 'Present-value benefit of delaying the upgrade using a 7% discount rate.',
      accent: 'green',
    },
    {
      icon: PlugZap,
      label: 'Deferral feasibility',
      value: gridAnalysis.feasibility,
      unit: '',
      helper: 'High, Medium, or Low screening result based on overload reduction.',
      accent: gridAnalysis.feasibility === 'High' ? 'green' : gridAnalysis.feasibility === 'Medium' ? 'cyan' : 'amber',
    },
  ]

  return (
    <section className="section-panel" id="grid-impact">
      <SectionIntro eyebrow="Grid Impact / BESS Deferral Analysis" title="Transformer Loading and Non-Wires Alternative Screen">
        Estimate whether battery discharge could reduce a future transformer overload and defer a
        planned infrastructure upgrade.
      </SectionIntro>
      <div className="advanced-layout">
        <div className="advanced-card">
          <div className="mini-card-heading">
            <PlugZap size={18} />
            <div>
              <h4>Grid Planning Inputs</h4>
              <p>Power-systems assumptions for the BESS deferral screen.</p>
            </div>
          </div>
          <div className="form-grid two">
            <Field label="Existing transformer rating" helper="Nameplate rating in kVA.">
              <input
                className="input"
                min="0"
                type="number"
                value={gridInputs.transformerRatingKva}
                onChange={(event) => updateGridInput('transformerRatingKva', event.target.value)}
              />
            </Field>
            <Field label="Current peak load" helper="Current feeder/building peak in kW.">
              <input
                className="input"
                min="0"
                type="number"
                value={gridInputs.currentPeakLoadKw}
                onChange={(event) => updateGridInput('currentPeakLoadKw', event.target.value)}
              />
            </Field>
            <Field label="Annual load growth" helper="Projected yearly peak-load growth percentage.">
              <input
                className="input"
                min="0"
                step="0.1"
                type="number"
                value={gridInputs.annualLoadGrowthPercent}
                onChange={(event) => updateGridInput('annualLoadGrowthPercent', event.target.value)}
              />
            </Field>
            <Field label="Planned upgrade cost" helper="Estimated transformer or feeder upgrade cost.">
              <input
                className="input"
                min="0"
                type="number"
                value={gridInputs.plannedUpgradeCost}
                onChange={(event) => updateGridInput('plannedUpgradeCost', event.target.value)}
              />
            </Field>
            <Field label="Battery discharge power" helper="Peak shaving power available from BESS in kW.">
              <input
                className="input"
                min="0"
                type="number"
                value={gridInputs.batteryDischargePowerKw}
                onChange={(event) => updateGridInput('batteryDischargePowerKw', event.target.value)}
              />
            </Field>
            <Field label="Deferral target" helper="Number of years to defer the upgrade.">
              <input
                className="input"
                min="1"
                type="number"
                value={gridInputs.deferralYears}
                onChange={(event) => updateGridInput('deferralYears', event.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="grid-impact-metrics">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} {...metric} />
          ))}
        </div>
      </div>
      <div className="engineering-note">
        <Info size={18} />
        <p>
          This is a simplified planning estimate inspired by non-wires alternatives and BESS
          deferral studies. It is not a full utility-grade load-flow or protection study.
        </p>
      </div>
    </section>
  )
}

function ScenarioWorkspace({
  inputs,
  results,
  recommendation,
  gridAnalysis,
  savedScenarios,
  onSave,
  onLoad,
  onDelete,
  onGenerateReport,
}) {
  return (
    <section className="section-panel" id="scenarios">
      <SectionIntro eyebrow="Saved Scenarios and Report" title="Scenario Workspace">
        Store front-end planning cases in your browser and generate a downloadable engineering-style
        summary for portfolio demos or follow-up review.
      </SectionIntro>
      <div className="workspace-actions">
        <button className="primary-button dark" type="button" onClick={onSave}>
          <Save size={18} />
          Save Scenario
        </button>
        <button className="secondary-button light" type="button" onClick={onGenerateReport}>
          <Download size={18} />
          Generate Planning Report
        </button>
      </div>

      <div className="saved-scenario-grid">
        <article className="advanced-card report-preview-card">
          <div className="mini-card-heading">
            <FileText size={18} />
            <div>
              <h4>Current Scenario Snapshot</h4>
              <p>What will be saved or included in the planning report.</p>
            </div>
          </div>
          <div className="data-list">
            <div>
              <span>Location</span>
              <strong>
                {inputs.city}, {inputs.state} {inputs.zipCode}
              </strong>
            </div>
            <div>
              <span>Monthly kWh</span>
              <strong>{formatNumber(inputs.monthlyKwh)} kWh</strong>
            </div>
            <div>
              <span>Solar size</span>
              <strong>{formatNumber(results.recommendedSolarSizeKw, 1)} kW</strong>
            </div>
            <div>
              <span>Battery size</span>
              <strong>{formatNumber(results.batterySizeKwh, 1)} kWh</strong>
            </div>
            <div>
              <span>Annual savings</span>
              <strong>{formatCurrency(results.yearlySolarSavings)}</strong>
            </div>
            <div>
              <span>Recommendation</span>
              <strong>{recommendation.title}</strong>
            </div>
            <div>
              <span>BESS deferral</span>
              <strong>{gridAnalysis.feasibility}</strong>
            </div>
          </div>
        </article>

        <article className="advanced-card saved-list-card">
          <div className="mini-card-heading">
            <Database size={18} />
            <div>
              <h4>Saved Scenario List</h4>
              <p>Stored locally with browser localStorage.</p>
            </div>
          </div>
          {savedScenarios.length === 0 ? (
            <div className="empty-state">
              <Upload size={22} />
              <p>No saved scenarios yet. Save the current plan to compare it later.</p>
            </div>
          ) : (
            <div className="scenario-list">
              {savedScenarios.map((scenario) => (
                <div className="scenario-row" key={scenario.id}>
                  <div>
                    <strong>{scenario.location}</strong>
                    <span>
                      {formatNumber(scenario.monthlyKwh)} kWh/mo · {formatNumber(scenario.solarSize, 1)} kW PV ·{' '}
                      {scenario.recommendation}
                    </span>
                    <small>{scenario.timestamp}</small>
                  </div>
                  <div className="scenario-actions">
                    <button type="button" onClick={() => onLoad(scenario)}>
                      Load
                    </button>
                    <button className="delete" type="button" onClick={() => onDelete(scenario.id)}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
      <div className="engineering-note">
        <Info size={18} />
        <p>
          Saved scenarios stay frontend-only. They are useful for comparing planning assumptions
          during a portfolio walkthrough without adding accounts or a backend.
        </p>
      </div>
    </section>
  )
}

function ResultsDashboard({ results }) {
  const payback =
    Number.isFinite(results.paybackPeriodYears) && results.paybackPeriodYears < 100
      ? formatNumber(results.paybackPeriodYears, 1)
      : 'N/A'

  const metrics = [
    {
      icon: Sun,
      label: 'Recommended solar system size',
      value: formatNumber(results.recommendedSolarSizeKw, 1),
      unit: 'kW',
      helper: `Desired size is ${formatNumber(results.requiredSolarSizeKw, 1)} kW; roof limit is ${formatNumber(results.roofLimitedMaxSolarKw, 1)} kW.`,
      accent: 'green',
    },
    {
      icon: Bolt,
      label: 'Annual solar production',
      value: formatNumber(results.annualSolarProduction),
      unit: 'kWh/yr',
      helper: `System size x 8760 annual hours x ${formatNumber(results.effectiveCapacityFactor * 100, 1)}% adjusted capacity factor.`,
      accent: 'cyan',
    },
    {
      icon: CloudSun,
      label: 'Solar resource score',
      value: formatNumber(results.locationProfile.solarResourceScore),
      unit: '/100',
      helper: `${results.locationProfile.scoreCategory} irradiance category for ${results.locationProfile.label}.`,
      accent: 'cyan',
    },
    {
      icon: Activity,
      label: 'Climate adjustment',
      value: formatNumber(results.climateAdjustment, 2),
      unit: 'factor',
      helper:
        'Climate adjustment modifies estimated production based on simplified regional solar/weather assumptions.',
      accent: 'blue',
    },
    {
      icon: CircleDollarSign,
      label: 'Yearly savings',
      value: formatCurrency(results.yearlySolarSavings),
      unit: 'USD',
      helper: 'Solar energy used on site multiplied by the entered electricity rate.',
      accent: 'green',
    },
    {
      icon: LineChart,
      label: '10-year savings',
      value: formatCurrency(results.tenYearSavings),
      unit: '10 yr',
      helper: 'Simple 10-year energy savings before incentives, financing, and maintenance.',
      accent: 'blue',
    },
    {
      icon: Leaf,
      label: 'CO2 reduction',
      value: formatNumber(results.co2ReductionTons, 1),
      unit: 'tons/yr',
      helper: 'Uses 0.855 pounds of CO2 avoided per solar kWh supplied.',
      accent: 'green',
    },
    {
      icon: BatteryCharging,
      label: 'Battery size estimate',
      value: formatNumber(results.batterySizeKwh, 1),
      unit: 'kWh',
      helper: 'Peak load multiplied by desired backup hours.',
      accent: 'cyan',
    },
    {
      icon: WalletCards,
      label: 'Total project cost',
      value: formatCurrency(results.totalProjectCost),
      unit: 'est.',
      helper: 'Solar, battery, and an 8% planning allowance for other costs.',
      accent: 'blue',
    },
    {
      icon: Clock3,
      label: 'Payback period',
      value: payback,
      unit: payback === 'N/A' ? '' : 'years',
      helper: 'Solar installed cost divided by estimated yearly solar savings.',
      accent: 'amber',
    },
    {
      icon: Target,
      label: 'Annual usage covered by solar',
      value: formatNumber(results.annualCoveragePercent, 0),
      unit: '%',
      helper: 'Solar kWh used divided by annual site usage.',
      accent: 'green',
    },
    {
      icon: Factory,
      label: 'Grid energy remaining',
      value: formatNumber(results.gridEnergyRemaining),
      unit: 'kWh/yr',
      helper: 'Annual energy demand that remains after estimated solar production.',
      accent: 'slate',
    },
  ]

  return (
    <section className="metric-grid">
      {metrics.map((metric) => (
        <MetricCard key={metric.label} {...metric} />
      ))}
    </section>
  )
}

function Charts({ results }) {
  const costComparison = createCostComparison(results)
  const energyBreakdown = [
    { name: 'Solar supplied energy', value: Math.round(results.solarKwhUsed) },
    { name: 'Remaining grid energy', value: Math.round(results.gridEnergyRemaining) },
  ]
  const costBreakdown = [
    { name: 'Solar cost', cost: Math.round(results.solarCost) },
    { name: 'Battery cost', cost: Math.round(results.batteryCost) },
    { name: 'Other estimate', cost: Math.round(results.otherProjectCost) },
  ]

  return (
    <section className="chart-grid">
      <div className="chart-card wide">
        <div className="chart-heading">
          <div className="icon-shell compact">
            <LineChart size={18} />
          </div>
          <div>
            <h3>10-Year Cost Comparison</h3>
            <p>
              Grid-only cumulative cost compared with the renewable scenario after estimated solar
              savings and project cost.
            </p>
          </div>
        </div>
        <div className="chart-frame tall">
          <ResponsiveContainer height="100%" minHeight={0} minWidth={0} width="100%">
            <AreaChart data={costComparison} margin={{ left: 4, right: 18, top: 18, bottom: 6 }}>
              <defs>
                <linearGradient id="gridOnly" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.24} />
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.04} />
                </linearGradient>
                <linearGradient id="renewable" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.34} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#dbe5ee" strokeDasharray="3 3" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                label={{ value: 'Cumulative cost', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend wrapperStyle={{ paddingTop: 12 }} />
              <Area
                dataKey="Grid only"
                fill="url(#gridOnly)"
                stroke="#64748b"
                strokeWidth={2}
                type="monotone"
              />
              <Area
                dataKey="Renewable scenario"
                fill="url(#renewable)"
                stroke="#16a34a"
                strokeWidth={3}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-heading">
          <div className="icon-shell compact">
            <Cpu size={18} />
          </div>
          <div>
            <h3>Annual Energy Breakdown</h3>
            <p>Solar-supplied energy versus remaining grid energy, showing the estimated offset.</p>
          </div>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer height="100%" minHeight={0} minWidth={0} width="100%">
            <PieChart>
              <Pie
                data={energyBreakdown}
                dataKey="value"
                innerRadius={62}
                nameKey="name"
                outerRadius={98}
                paddingAngle={3}
              >
                {energyBreakdown.map((entry, index) => (
                  <Cell fill={chartColors[index]} key={entry.name} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${formatNumber(value)} kWh`} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-heading">
          <div className="icon-shell compact">
            <Building2 size={18} />
          </div>
          <div>
            <h3>Project Cost Breakdown</h3>
            <p>Solar, storage, and planning allowance estimates highlight the main cost drivers.</p>
          </div>
        </div>
        <div className="chart-frame">
          <ResponsiveContainer height="100%" minHeight={0} minWidth={0} width="100%">
            <BarChart data={costBreakdown} margin={{ left: 4, right: 18, top: 18, bottom: 6 }}>
              <CartesianGrid stroke="#dbe5ee" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis
                label={{ value: 'Estimated cost', angle: -90, position: 'insideLeft', fill: '#64748b' }}
                tick={{ fill: '#64748b', fontSize: 12 }}
                tickFormatter={(value) => `$${value / 1000}k`}
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="cost" radius={[10, 10, 0, 0]}>
                {costBreakdown.map((entry, index) => (
                  <Cell fill={chartColors[index]} key={entry.name} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}

function EducationSection() {
  const items = [
    {
      icon: Sun,
      title: 'Solar production estimate',
      text: 'GridWise multiplies the proposed PV size by 8760 annual hours and an adjusted regional capacity factor. The adjustment combines solar resource and simplified weather assumptions.',
    },
    {
      icon: CircleDollarSign,
      title: 'Electricity savings',
      text: 'Savings are based on solar kWh used on site and the final rate selected by the utility-rate helper. If the user enters 0, the model applies a regional estimate.',
    },
    {
      icon: BatteryCharging,
      title: 'Battery sizing',
      text: 'The storage estimate uses peak load multiplied by desired backup hours. This represents energy capacity, not a complete inverter or critical-load design.',
    },
    {
      icon: Leaf,
      title: 'CO2 reduction',
      text: 'The emissions estimate applies 0.855 pounds of avoided CO2 per solar kWh and converts the result into tons per year.',
    },
    {
      icon: Clock3,
      title: 'Payback period',
      text: 'Simple payback divides solar installed cost by annual solar savings. It is useful for screening but does not include incentives, financing, or maintenance.',
    },
    {
      icon: ShieldCheck,
      title: 'Grid and BESS screening',
      text: 'The transformer deferral screen converts kVA to kW, projects peak-load growth, and estimates whether BESS discharge can reduce a future overload.',
    },
    {
      icon: Info,
      title: 'Limitations of the model',
      text: 'Real designs require roof geometry, shading, utility interconnection rules, electrical code review, load-flow studies, protection review, equipment selection, and professional engineering judgment.',
    },
  ]

  return (
    <section className="section-panel" id="how-it-works">
      <SectionIntro eyebrow="Engineering Notes" title="How the Estimate Works">
        Plain-English explanation of the simplified formulas behind the dashboard.
      </SectionIntro>
      <div className="explain-grid">
        {items.map((item) => {
          const Icon = item.icon

          return (
            <article className="explain-card" key={item.title}>
              <div className="icon-shell compact">
                <Icon size={17} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          )
        })}
      </div>
      <div className="disclaimer-card">
        <Info size={18} />
        <p>
          This platform provides simplified planning estimates for education and early-stage
          decision support. It is not a substitute for a stamped engineering design, contractor
          quote, utility interconnection study, or detailed financial analysis.
        </p>
      </div>
    </section>
  )
}

function ImpactSection() {
  const impacts = [
    {
      icon: Sun,
      title: 'Lower the barrier to clean energy adoption',
      text: 'Many people are interested in solar and storage but do not know where to begin. GridWise gives users a clear starting point before they commit to vendor calls, site visits, or paid studies.',
    },
    {
      icon: CircleDollarSign,
      title: 'Understand cost and payback before spending money',
      text: 'Early financial visibility helps users ask better questions and compare options more confidently. GridWise translates energy usage into cost, savings, and payback estimates that are easy to scan.',
    },
    {
      icon: BatteryCharging,
      title: 'Improve resilience through battery backup planning',
      text: 'Battery storage is often discussed as a black box. GridWise connects backup duration, peak load, and kWh sizing so users can reason about resilience in practical terms.',
    },
    {
      icon: Leaf,
      title: 'Estimate carbon reduction from renewable energy',
      text: 'Clean-energy planning should connect dollars with environmental impact. GridWise estimates avoided carbon emissions so users can understand both financial and sustainability outcomes.',
    },
    {
      icon: PlugZap,
      title: 'Support grid modernization and BESS deferral conversations',
      text: 'Battery storage can do more than back up buildings. GridWise introduces transformer loading and BESS deferral concepts to show how storage can support grid planning and infrastructure decisions.',
    },
    {
      icon: Lightbulb,
      title: 'Make energy planning easier for non-experts',
      text: 'The platform presents technical calculations through visual cards, explanations, and recommendations. This makes renewable energy planning more approachable for homeowners, campuses, and small organizations.',
    },
  ]

  return (
    <section className="app-container page-section" id="impact">
      <SectionIntro eyebrow="Why GridWise Matters" title="Clean-Energy Planning With Real-World Impact">
        GridWise is positioned as an early-stage decision-support platform for people and
        organizations trying to understand renewable energy, resilience, and grid impacts before
        making expensive commitments.
      </SectionIntro>
      <div className="impact-grid">
        {impacts.map((impact) => {
          const Icon = impact.icon

          return (
            <article className="impact-card" key={impact.title}>
              <div className="icon-shell compact">
                <Icon size={18} />
              </div>
              <h3>{impact.title}</h3>
              <p>{impact.text}</p>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function FounderSection() {
  const tags = [
    'Power Systems',
    'Renewable Energy',
    'Battery Storage',
    'Grid Modernization',
    'Engineering Software',
    'Mathematics Minor',
  ]

  return (
    <section className="section-panel founder-panel" id="founder">
      <SectionIntro eyebrow="Founder / Developer" title="Built From an Electrical Engineering Perspective">
        GridWise connects renewable energy planning, power systems, battery storage, and engineering
        software into one polished portfolio platform.
      </SectionIntro>
      <div className="founder-card">
        <div className="founder-identity">
          <div className="founder-avatar">NN</div>
          <div>
            <h3>Nas Nfaoui</h3>
            <p>Clarkson University</p>
            <span>Senior Electrical Engineering Student</span>
            <small>Minor in Mathematics · Concentration in Power Engineering</small>
          </div>
        </div>
        <div className="founder-copy">
          <p>
            Nas Nfaoui is a senior Electrical Engineering student at Clarkson University with a
            minor in Mathematics and a concentration in Power Engineering. His interests include
            power systems, renewable energy, battery energy storage systems, grid modernization, and
            engineering tools that make complex technical decisions more accessible. GridWise was
            created to combine these interests into a practical platform that helps users explore
            clean-energy options through clear calculations, visual insights, and decision-support
            logic.
          </p>
          <p>
            My long-term goal is to contribute to the future of resilient, affordable, and
            sustainable energy systems. I am especially interested in using engineering, software,
            and data-driven tools to help communities, utilities, and organizations make better
            infrastructure and clean-energy decisions.
          </p>
          <div className="founder-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function EmployerSummary() {
  const summaries = [
    {
      title: 'Product Mission',
      text: 'GridWise is designed to make early-stage clean-energy planning more accessible, visual, and technically grounded for homeowners, campuses, small businesses, and communities.',
    },
    {
      title: 'Problem Statement',
      text: 'Many homeowners, students, and small organizations are interested in renewable energy but do not know how to estimate system size, cost, savings, or battery storage needs.',
    },
    {
      title: 'What GridWise Does',
      text: 'GridWise turns building energy inputs into solar sizing, battery storage estimates, cost and savings projections, carbon reduction, grid-impact insights, recommendations, saved scenarios, and downloadable planning reports.',
    },
    {
      title: 'Engineering Concepts Applied',
      text: 'Renewable energy analysis, location-based solar assumptions, utility-rate modeling, battery kWh sizing, cost modeling, carbon reduction, payback period, grid energy offset, transformer loading, and BESS deferral screening.',
    },
    {
      title: 'Development Tools',
      text: 'React, Vite, Tailwind CSS, Recharts, lucide-react, browser localStorage, deterministic frontend calculations, and downloadable report generation.',
    },
    {
      title: 'Role of AI-Assisted Development',
      text: 'AI-assisted coding tools were used to accelerate prototyping, frontend development, debugging, and interface refinement. The project direction, energy planning scope, engineering assumptions, and final presentation were guided by the developer.',
    },
    {
      title: 'Future Development Roadmap',
      text: 'Real solar irradiance data by ZIP code, utility rate API integration, weather and climate data integration, real battery product comparison data, transformer loading using real load profiles, more advanced BESS deferral and non-wires alternative modeling, downloadable PDF reports, cloud-based saved scenarios, user accounts for homeowners, campuses, and small businesses, and a professional version for consultants/utilities.',
    },
  ]

  return (
    <section className="section-panel employer-panel" id="employers">
      <SectionIntro eyebrow="Portfolio Case Study" title="Project Summary for Employers">
        A concise recruiter-facing snapshot of the product mission, engineering thinking,
        implementation scope, and future development roadmap.
      </SectionIntro>
      <div className="employer-grid">
        {summaries.map((summary, index) => (
          <article className="employer-card" key={summary.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{summary.title}</h3>
            <p>{summary.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [inputs, setInputs] = useState(initialInputs)
  const [gridInputs, setGridInputs] = useState(initialGridInputs)
  const [savedScenarios, setSavedScenarios] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('gridwise-scenarios') ?? '[]')
    } catch {
      return []
    }
  })
  const results = useMemo(() => calculateEnergyPlan(inputs), [inputs])
  const recommendation = useMemo(() => buildRecommendation(inputs, results), [inputs, results])
  const gridAnalysis = useMemo(() => analyzeGridDeferral(gridInputs), [gridInputs])

  useEffect(() => {
    localStorage.setItem('gridwise-scenarios', JSON.stringify(savedScenarios))
  }, [savedScenarios])

  const saveScenario = () => {
    const timestamp = new Date().toLocaleString()
    const scenario = {
      id: `${Date.now()}`,
      inputs,
      gridInputs,
      location: `${inputs.city}, ${inputs.state} ${inputs.zipCode}`,
      monthlyKwh: inputs.monthlyKwh,
      solarSize: results.recommendedSolarSizeKw,
      batterySize: results.batterySizeKwh,
      annualSavings: results.yearlySolarSavings,
      recommendation: recommendation.title,
      timestamp,
    }

    setSavedScenarios((current) => [scenario, ...current].slice(0, 8))
  }

  const loadScenario = (scenario) => {
    setInputs({ ...initialInputs, ...scenario.inputs })
    setGridInputs({ ...initialGridInputs, ...scenario.gridInputs })
    window.location.hash = '#planner'
  }

  const deleteScenario = (scenarioId) => {
    setSavedScenarios((current) => current.filter((scenario) => scenario.id !== scenarioId))
  }

  const generateReport = () => {
    const report = createPlanningReport(inputs, results, recommendation, gridInputs, gridAnalysis)
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `gridwise-ai-report-${Date.now()}.txt`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <main className="app-shell">
      <Hero results={results} />

      <ImpactSection />

      <section className="app-container page-section" id="planner">
        <SectionIntro eyebrow="Energy Input Form" title="Configure the Building Scenario">
          Enter basic usage, roof, storage, and budget assumptions. The defaults make the dashboard
          work immediately while still supporting realistic what-if exploration.
        </SectionIntro>
        <InputForm inputs={inputs} results={results} setInputs={setInputs} />
      </section>

      <section className="app-container page-section">
        <RecommendationCard inputs={inputs} recommendation={recommendation} results={results} />
      </section>

      <section className="app-container page-section" id="results">
        <ExecutiveSummary
          gridAnalysis={gridAnalysis}
          recommendation={recommendation}
          results={results}
        />
        <SectionIntro eyebrow="Results Dashboard" title="Engineering KPI Summary">
          Key sizing, cost, emissions, resilience, and grid-dependence metrics update instantly as
          inputs change.
        </SectionIntro>
        <ResultsDashboard results={results} />
      </section>

      <section className="app-container page-section">
        <BatteryStorageOptions requiredBatteryKwh={results.batterySizeKwh} />
      </section>

      <section className="app-container page-section">
        <GridDeferralSection
          gridAnalysis={gridAnalysis}
          gridInputs={gridInputs}
          setGridInputs={setGridInputs}
        />
      </section>

      <section className="app-container page-section">
        <ScenarioWorkspace
          gridAnalysis={gridAnalysis}
          inputs={inputs}
          onDelete={deleteScenario}
          onGenerateReport={generateReport}
          onLoad={loadScenario}
          onSave={saveScenario}
          recommendation={recommendation}
          results={results}
          savedScenarios={savedScenarios}
        />
      </section>

      <section className="app-container page-section" id="analytics">
        <SectionIntro eyebrow="Charts and Cost Analysis" title="Scenario Analytics">
          Visualize long-term cost, energy offset, and project cost drivers in a recruiter-friendly
          dashboard format.
        </SectionIntro>
        <Charts results={results} />
      </section>

      <div className="app-container lower-sections">
        <EducationSection />
        <FounderSection />
        <EmployerSummary />
      </div>
    </main>
  )
}

export default App
