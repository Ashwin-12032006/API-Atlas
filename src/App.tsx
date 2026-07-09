import { useState, useEffect } from 'react';
import './App.css';
import appsData from '../research_results.json';
import verificationData from '../verification_report.json';
import { 
  Play, 
  Search, 
  Copy, 
  Check, 
  ArrowUpRight, 
  ChevronRight, 
  Brain, 
  Cpu, 
  Activity, 
  LineChart,
  FileText 
} from 'lucide-react';

interface AppItem {
  id: number;
  name: string;
  category: string;
  one_liner: string;
  auth: string;
  gating: string;
  api_surface: string;
  verdict: string;
  evidence: string;
}

export default function App() {
  // 100 Apps Database State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedGating, setSelectedGating] = useState('');
  const [selectedVerdict, setSelectedVerdict] = useState('');
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeClusterTab, setActiveClusterTab] = useState('Self-Serve');
  const [copied, setCopied] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Live Verification Console State
  const [verificationActive, setVerificationActive] = useState(false);
  const [sampleSize, setSampleSize] = useState('15');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [firstPassAcc, setFirstPassAcc] = useState(verificationData.first_pass_accuracy || 93.3);
  const [agentAcc, setAgentAcc] = useState(verificationData.agent_accuracy || 100.0);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    const el = document.getElementById("verifyConsoleBox");
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [terminalLogs]);

  // Reset pagination on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedGating, selectedVerdict, pageSize]);

  // Compute Categories dynamically
  const categories = Array.from(new Set(appsData.map(app => app.category)));

  // Dynamic metrics calculation
  const totalApps = appsData.length;
  const selfServeCount = appsData.filter(app => !app.gating.toLowerCase().includes('gated')).length;
  const aiReadyCount = appsData.filter(app => app.verdict.toLowerCase().includes('yes')).length;

  // Filter logic
  const filteredApps = appsData.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          app.one_liner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          app.auth.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '' || app.category === selectedCategory;
    const matchesGating = selectedGating === '' || 
                          (selectedGating === 'Self-serve' && !app.gating.toLowerCase().includes('gated')) ||
                          (selectedGating === 'Gated' && app.gating.toLowerCase().includes('gated'));
    
    let matchesVerdict = true;
    if (selectedVerdict !== '') {
      const verd = app.verdict.toLowerCase();
      if (selectedVerdict === 'Yes') matchesVerdict = verd.includes('yes');
      else if (selectedVerdict === 'No') matchesVerdict = verd.includes('no');
      else if (selectedVerdict === 'Gated') matchesVerdict = verd.includes('gated') || verd.includes('friction');
    }

    return matchesSearch && matchesCategory && matchesGating && matchesVerdict;
  });

  // Pagination & Export Logic
  const totalPages = Math.ceil(filteredApps.length / pageSize);
  const paginatedApps = filteredApps.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportCSV = () => {
    const headers = ["ID", "App Name", "Category", "Description", "Auth Standards", "Gating Status", "API Surface", "Verdict", "Evidence Docs Link"];
    const rows = filteredApps.map(app => [
      app.id,
      `"${app.name.replace(/"/g, '""')}"`,
      `"${app.category.replace(/"/g, '""')}"`,
      `"${app.one_liner.replace(/"/g, '""')}"`,
      `"${app.auth.replace(/"/g, '""')}"`,
      `"${app.gating.replace(/"/g, '""')}"`,
      `"${app.api_surface.replace(/"/g, '""')}"`,
      `"${app.verdict.replace(/"/g, '""')}"`,
      `"${app.evidence.replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "composio_saas_audit_atlas.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy code snippet to clipboard
  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate toolkit code dynamically
  const getCodeSnippet = (app: AppItem) => {
    const appKey = app.name.toUpperCase().replace(/\s+/g, '_');
    if (app.auth.toLowerCase().includes('oauth')) {
      return `from composio import ComposioToolSet, App\n\ntoolset = ComposioToolSet()\n# Authenticate via Composio Secure OAuth Gateway\nactions = toolset.get_actions(apps=[App.${appKey}])\nprint(f"Loaded {len(actions)} integrations for ${app.name}")`;
    }
    return `from composio import ComposioToolSet, App\n\ntoolset = ComposioToolSet()\n# Inject API credentials securely\ntoolset.set_api_key("YOUR_${appKey}_API_KEY")\n\nactions = toolset.get_actions(apps=[App.${appKey}])\nprint(f"Successfully loaded ${app.name} toolkit")`;
  };

  // Trigger real-time EventSource verification execution
  const triggerLiveVerification = () => {
    if (verificationActive) return;
    setVerificationActive(true);
    setTerminalLogs([
      "host:~$ python verify_agent.py --sample " + sampleSize + " --stream",
      "Connecting to Python backend event stream..."
    ]);

    const eventSource = new EventSource('http://localhost:8000/run-verify?sample=' + sampleSize);

    eventSource.onmessage = (event) => {
      const line = event.data;
      if (line === "[DONE]") {
        eventSource.close();
        setTerminalLogs(prev => [
          ...prev,
          "=========================================",
          "Live Subprocess Execution Complete."
        ]);
        
        // Fetch updated metrics
        fetch('http://localhost:8000/verification_report.json')
          .then(res => res.json())
          .then(data => {
            setFirstPassAcc(data.first_pass_accuracy);
            setAgentAcc(data.agent_accuracy);
          })
          .catch(err => console.error("Error fetching report:", err));
        
        setVerificationActive(false);
      } else {
        setTerminalLogs(prev => [...prev, line]);
      }
    };

    eventSource.onerror = (err) => {
      console.error("EventSource connection failed:", err);
      setTerminalLogs(prev => [
        ...prev,
        "Connection Error: Failed to fetch live stream from python backend.",
        "Please verify that 'server.py' is running on port 8000."
      ]);
      eventSource.close();
      setVerificationActive(false);
    };
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground selection:bg-muted selection:text-foreground">
      
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 z-0 object-cover w-full h-screen pointer-events-none"
      >
        <source
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4"
          type="video/mp4"
        />
      </video>

      {/* Hero Visual Shadow overlay for readability */}
      <div className="absolute inset-0 h-screen bg-gradient-to-b from-black/20 via-black/10 to-background z-1 pointer-events-none"></div>

      {/* Floating Glassmorphic Navigation */}
      <header className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-5xl liquid-glass rounded-full px-8 py-3.5 flex items-center justify-between">
        <a 
          href="/" 
          className="text-2xl tracking-tight text-foreground transition-opacity hover:opacity-90"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Atlas API<sup className="text-xs">®</sup>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#" className="text-xs font-semibold uppercase tracking-wider text-foreground">
            Atlas
          </a>
          <a href="#dashboard" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            HUD Overview
          </a>
          <a href="#matrix" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            SaaS Matrix
          </a>
          <a href="#pipeline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            Verification
          </a>
        </nav>

        <a href="#matrix" className="liquid-glass rounded-full px-5 py-2 text-xs font-semibold uppercase tracking-wider text-foreground hover:scale-[1.03] transition-transform duration-300 ease-out">
          Explore Atlas
        </a>
      </header>

      {/* Fullscreen Editorial Hero */}
      <section className="relative z-10 w-full h-screen flex flex-col justify-between px-6 pt-32 pb-24">
        <div></div> {/* Spacing spacer */}
        
        <div className="flex flex-col items-center justify-center text-center max-w-7xl mx-auto">
          <h1 
            className="text-5xl sm:text-7xl md:text-8xl leading-[0.95] tracking-[-2.46px] max-w-6xl font-normal text-foreground animate-fade-rise"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Where <em className="not-italic text-muted-foreground">intelligence</em> meets <br />
            <em className="not-italic text-muted-foreground">the API surface.</em>
          </h1>
          
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mt-8 leading-relaxed animate-fade-rise-delay">
            An agentic audit mapping authentication standards, gating parameters, and integration blockages across 100 SaaS applications for Composio toolification.
          </p>

          <a href="#matrix" className="liquid-glass rounded-full px-12 py-4.5 text-xs font-semibold uppercase tracking-wider text-foreground mt-12 hover:scale-[1.03] transition-transform duration-300 ease-out animate-fade-rise-delay-2">
            Explore Atlas
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="flex flex-col items-center justify-center text-muted-foreground animate-pulse text-xs tracking-widest uppercase">
          <span>Scroll to explore</span>
          <ChevronRight className="rotate-90 w-4 h-4 mt-2" />
        </div>
      </section>

      {/* Content wrapper */}
      <div className="relative z-10 bg-background w-full">

        {/* Dynamic Glowing background Orbs */}
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] rounded-full bg-blue-900/10 blur-[80px] pointer-events-none"></div>
        <div className="absolute top-[800px] right-1/4 w-[500px] h-[500px] rounded-full bg-purple-900/10 blur-[90px] pointer-events-none"></div>

        {/* Section 1: AI Dashboard Preview Cards */}
        <section id="dashboard" className="max-w-7xl mx-auto px-6 py-24 border-b border-border/40">
          <header className="mb-16">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">01 / System Overview</span>
            <h2 className="text-4xl font-normal mt-2 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
              The AI Operating Environment.
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mt-2">
              Futuristic HUD metrics and canvas flows running alongside our real-time audit tools.
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: AI Workspace */}
            <div className="liquid-glass p-6 rounded-2xl flex flex-col justify-between min-h-[260px] group hover:border-border transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Brain className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">active</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-foreground">AI Workspace</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Intelligent command center managing SaaS crawlers and context-aware agents.
                </p>
              </div>
              <div className="flex items-center justify-between mt-4 gap-4">
                <div className="bg-black/40 rounded-lg p-2.5 font-mono text-[9px] text-muted-foreground flex-1 flex flex-col gap-0.5 border border-white/5">
                  <div>&gt; verify.py - RUNNING</div>
                  <div>&gt; task: apps_seed_audit</div>
                </div>
                <div className="grid grid-cols-4 gap-1.5 w-10 h-10 shrink-0">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <span 
                      key={i} 
                      className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 animate-led"
                      style={{ animationDelay: `${(i * 179) % 1500}ms` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2: Neural Canvas */}
            <div className="liquid-glass p-6 rounded-2xl flex flex-col justify-between min-h-[260px] group hover:border-border transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Cpu className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">graph</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-foreground">Neural Canvas</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Thought mapping and dynamic visual intelligence representing API structures.
                </p>
              </div>
              {/* Custom SVG Nodes representation with flowing laser lines */}
              <div className="h-16 flex items-center justify-center relative mt-4">
                <svg className="w-full h-full" viewBox="0 0 200 60">
                  <circle cx="30" cy="30" r="4.5" fill="#9061f9" />
                  <circle cx="100" cy="15" r="4.5" fill="#3b82f6" />
                  <circle cx="100" cy="45" r="4.5" fill="#10b981" />
                  <circle cx="170" cy="30" r="4.5" fill="#fff" />
                  
                  {/* Background static lines */}
                  <line x1="34" y1="30" x2="96" y2="15" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="34" y1="30" x2="96" y2="45" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="104" y1="15" x2="166" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  <line x1="104" y1="45" x2="166" y2="30" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                  
                  {/* Laser pulse animated lines */}
                  <line x1="34" y1="30" x2="96" y2="15" stroke="#9061f9" strokeWidth="1.5" className="animate-dash" />
                  <line x1="34" y1="30" x2="96" y2="45" stroke="#10b981" strokeWidth="1.5" className="animate-dash" style={{ animationDelay: '400ms' }} />
                  <line x1="104" y1="15" x2="166" y2="30" stroke="#3b82f6" strokeWidth="1.5" className="animate-dash" style={{ animationDelay: '800ms' }} />
                  <line x1="104" y1="45" x2="166" y2="30" stroke="#fff" strokeWidth="1.5" className="animate-dash" style={{ animationDelay: '1200ms' }} />
                </svg>
              </div>
            </div>

            {/* Card 3: Deep Focus Engine */}
            <div className="liquid-glass p-6 rounded-2xl flex flex-col justify-between min-h-[260px] group hover:border-border transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Activity className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-purple-400">analytics</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-foreground">Deep Focus Engine</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Attention analytics tracking LLM tokens and API response latencies.
                </p>
              </div>
              <div className="flex items-center gap-4 mt-4 bg-black/20 p-2 rounded-xl border border-white/5">
                {/* SVG circular progress indicator */}
                <svg className="w-12 h-12 transform -rotate-90">
                  <circle cx="24" cy="24" r="18" stroke="rgba(255,255,255,0.05)" strokeWidth="3" fill="transparent" />
                  <circle cx="24" cy="24" r="18" stroke="#9061f9" strokeWidth="3" fill="transparent" 
                          strokeDasharray={113} strokeDashoffset={15} />
                </svg>
                <div>
                  <div className="text-xs font-semibold text-foreground">98.4% Efficiency</div>
                  <div className="text-[10px] text-muted-foreground">Attention: Optimal</div>
                </div>
              </div>
            </div>

            {/* Card 4: AI Research Hub */}
            <div className="liquid-glass p-6 rounded-2xl flex flex-col justify-between min-h-[260px] group hover:border-border transition-colors">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <LineChart className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-[10px] uppercase font-semibold text-muted-foreground">metrics</span>
                </div>
                <h3 className="text-sm font-semibold tracking-wide text-foreground">AI Research Hub</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Audited SaaS seed database. Integrates search matrix directly.
                </p>
              </div>
              <div className="flex flex-col gap-3 mt-4">
                <div className="h-10 w-full flex items-end">
                  <svg className="w-full h-full" viewBox="0 0 160 40">
                    <path 
                      d="M 10 35 Q 30 10, 50 25 T 90 15 T 130 5 T 150 20" 
                      fill="none" 
                      stroke="rgba(255,255,255,0.06)" 
                      strokeWidth="1" 
                    />
                    <path 
                      d="M 10 35 Q 30 10, 50 25 T 90 15 T 130 5 T 150 20" 
                      fill="none" 
                      stroke="#3b82f6" 
                      strokeWidth="1.5" 
                      className="animate-draw-graph" 
                    />
                  </svg>
                </div>
                <a href="#matrix" className="flex items-center justify-between text-[10px] font-semibold text-foreground bg-white/5 rounded-lg p-2.5 hover:bg-white/10 transition-colors">
                  <span>Explore 100 Apps</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

          </div>
        </section>

        {/* Section 2: Case Study Stats Grid Header */}
        <section className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="liquid-glass p-6 rounded-xl">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total Apps Audited</span>
              <div className="text-3xl font-light mt-1 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>{totalApps}</div>
            </div>
            <div className="liquid-glass p-6 rounded-xl">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Self-Serve APIs</span>
              <div className="text-3xl font-light mt-1 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {selfServeCount} <span className="text-xs text-muted-foreground">({Math.round(selfServeCount/totalApps*100)}%)</span>
              </div>
            </div>
            <div className="liquid-glass p-6 rounded-xl">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">AI Ready (Yes)</span>
              <div className="text-3xl font-light mt-1 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {aiReadyCount} <span className="text-xs text-muted-foreground">({Math.round(aiReadyCount/totalApps*100)}%)</span>
              </div>
            </div>
            <div className="liquid-glass p-6 rounded-xl">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Verified Accuracy</span>
              <div className="text-3xl font-light mt-1 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
                {agentAcc.toFixed(1)}%
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Pattern Clusters tab panel */}
        <section id="patterns" className="max-w-7xl mx-auto px-6 py-16 border-b border-border/40">
          <header className="mb-12">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">02 / Strategic Clusters</span>
            <h2 className="text-4xl font-normal mt-2 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Identified Pattern Profiles.
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mt-2">
              We segmented the audited SaaS apps into 6 developer profiles. Switch tabs below to see specifications.
            </p>
          </header>

          {/* Custom tab switcher */}
          <div className="flex gap-2 flex-wrap bg-white/5 p-1 rounded-xl border border-white/5 mb-8">
            {['Self-Serve', 'Gated', 'Sales', 'Paywalled', 'AI', 'CLI'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveClusterTab(tab)}
                className={`flex-1 min-w-[100px] text-xs font-semibold tracking-wider uppercase py-3 rounded-lg transition-all ${activeClusterTab === tab ? 'bg-white/10 text-foreground border border-white/10' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content Panels */}
          <div className="liquid-glass p-8 rounded-2xl">
            {activeClusterTab === 'Self-Serve' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>Self-Serve Giants</h3>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Apps that allow developers to sign up and get instant API access for free or on a trial (e.g. Asana, Slack, Zoom). These represent the most friction-free targets for Composio.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 flex flex-col gap-2 list-disc list-inside">
                    <li>Primary Auth: OAuth2 / API Key</li>
                    <li>Friction Level: Extremely Low</li>
                    <li>Composio Action: Create native tools directly using OpenAPI specifications.</li>
                  </ul>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2">Build Script:</div>
                  <div>from composio import ComposioToolSet, App</div>
                  <div># Instant build using OAuth2</div>
                  <div>actions = toolset.get_actions(apps=[App.SLACK])</div>
                </div>
              </div>
            )}
            
            {activeClusterTab === 'Gated' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>Compliance Gated</h3>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Enterprises that gate their developer settings behind security verification or compliance approvals (e.g. DocuSign, Microsoft Teams).
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 flex flex-col gap-2 list-disc list-inside">
                    <li>Primary Auth: OAuth2 with Tenant Admin Consent</li>
                    <li>Friction Level: High (Requires admin configurations)</li>
                    <li>Composio Action: Package credential configurations within partner portals.</li>
                  </ul>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2">Admin Grant:</div>
                  <div># Request MS OAuth Tenant Grant</div>
                  <div>scope = ["Files.Read", "User.Read"]</div>
                  <div>toolset.request_tenant_grant(scope)</div>
                </div>
              </div>
            )}

            {activeClusterTab === 'Sales' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>Sales Outreach Gated</h3>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Niche SaaS platforms requiring sales contact, manual partner onboarding, or custom pricing approval to issue API keys (e.g. DealCloud, Veeva).
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 flex flex-col gap-2 list-disc list-inside">
                    <li>Primary Auth: Custom Client Token</li>
                    <li>Friction Level: High</li>
                    <li>Composio Action: Coordinate partner relationship pipelines.</li>
                  </ul>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2">Outreach:</div>
                  <div># Requires custom enterprise gateway endpoint</div>
                  <div>url = "https://api.dealcloud.com/oauth/token"</div>
                </div>
              </div>
            )}

            {activeClusterTab === 'Paywalled' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>Paywalled APIs</h3>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Apps requiring a paid subscription plan to activate developer settings or acquire API keys (e.g. Salesforce, ActiveCampaign).
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 flex flex-col gap-2 list-disc list-inside">
                    <li>Primary Auth: OAuth2 / API Key</li>
                    <li>Friction Level: Moderate (Paywall constraint)</li>
                    <li>Composio Action: Document subscription dependencies in setup logs.</li>
                  </ul>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2">Paywall Check:</div>
                  <div># Check plan limits before loading actions</div>
                  <div>plan = toolset.get_billing_tier(App.SALESFORCE)</div>
                </div>
              </div>
            )}

            {activeClusterTab === 'AI' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>AI & Document Parsing</h3>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Modern AI platforms providing developer-centric endpoints (e.g. Firecrawl, Reducto). Highly optimized for agentic context.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 flex flex-col gap-2 list-disc list-inside">
                    <li>Primary Auth: API Key</li>
                    <li>Friction Level: Low</li>
                    <li>Composio Action: Create native agentic wrapper endpoints.</li>
                  </ul>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2">AI Config:</div>
                  <div>from reducto import Reducto</div>
                  <div>client = Reducto(api_key=API_KEY)</div>
                </div>
              </div>
            )}

            {activeClusterTab === 'CLI' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>Local CLIs</h3>
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    Command-line scripts or offline execution packages (e.g. Sherlock, Mermaid CLI). No hosted SaaS endpoints exist.
                  </p>
                  <ul className="text-xs text-muted-foreground mt-4 flex flex-col gap-2 list-disc list-inside">
                    <li>Primary Auth: None</li>
                    <li>Friction Level: High (Requires dockerized runtime)</li>
                    <li>Composio Action: Construct local shell execution wrapper components.</li>
                  </ul>
                </div>
                <div className="bg-black/30 rounded-xl p-4 font-mono text-xs border border-white/5">
                  <div className="text-[10px] text-muted-foreground uppercase mb-2">Subprocess Run:</div>
                  <div>import subprocess</div>
                  <div>subprocess.run(["python", "-m", "sherlock", user])</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Section 4: Interactive Matrix (Audit Table Explorer) */}
        <section id="matrix" className="max-w-7xl mx-auto px-6 py-16">
          <header className="mb-12">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">03 / Audit Database</span>
            <h2 className="text-4xl font-normal mt-2 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Interactive Audit Matrix.
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mt-2">
              Browse, filter, and extract credentials for any of the 100 audited SaaS apps. Click a row to view toolkit details and code.
            </p>
          </header>

          {/* Filtering Action Bar */}
          <div className="flex flex-wrap gap-4 items-center justify-between mb-6">
            <div className="flex gap-4 flex-1 min-w-[280px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  placeholder="Search app, description, or auth standard..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-border transition-colors"
                />
              </div>
              <button 
                onClick={handleExportCSV}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-foreground hover:bg-white/10 transition-colors flex items-center gap-2 cursor-pointer shrink-0"
              >
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </button>
            </div>

            <div className="flex gap-4 flex-wrap">
              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-foreground outline-none cursor-pointer focus:border-border"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <select 
                value={selectedGating} 
                onChange={e => setSelectedGating(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-foreground outline-none cursor-pointer focus:border-border"
              >
                <option value="">All Gating</option>
                <option value="Self-serve">Self-serve</option>
                <option value="Gated">Gated</option>
              </select>

              <select 
                value={selectedVerdict} 
                onChange={e => setSelectedVerdict(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 text-xs text-foreground outline-none cursor-pointer focus:border-border"
              >
                <option value="">All Verdicts</option>
                <option value="Yes">Yes (Ready)</option>
                <option value="Gated">Gated (Blockers)</option>
                <option value="No">No (Closed)</option>
              </select>
            </div>
          </div>

          {/* Matrix table */}
          <div className="liquid-glass rounded-2xl overflow-x-auto border border-border/40">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-white/5 border-b border-border/40 text-muted-foreground font-semibold uppercase tracking-wider">
                  <th className="py-4 px-6 w-[5%]">#</th>
                  <th className="py-4 px-6 w-[25%]">App Name</th>
                  <th className="py-4 px-6 w-[15%]">Auth Standards</th>
                  <th className="py-4 px-6 w-[20%]">Gating Status</th>
                  <th className="py-4 px-6 w-[25%]">API Surface</th>
                  <th className="py-4 px-6 w-[10%]">Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedApps.map((app) => (
                  <tr 
                    key={app.id} 
                    onClick={() => { setSelectedApp(app); setIsDrawerOpen(true); }}
                    className={`hover:bg-white/5 cursor-pointer transition-colors ${
                      selectedApp?.id === app.id ? 'bg-white/10 border-l-2 border-white' : ''
                    }`}
                  >
                    <td className="py-4 px-6 text-muted-foreground">{app.id}</td>
                    <td className="py-4 px-6 font-semibold flex items-center gap-2">
                      <span>{app.name}</span>
                      <span className="text-[9px] bg-white/5 text-muted-foreground px-2 py-0.5 rounded-full font-normal">{app.category}</span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground font-mono">{app.auth}</td>
                    <td className="py-4 px-6 text-muted-foreground">{app.gating}</td>
                    <td className="py-4 px-6 text-muted-foreground max-w-xs truncate">{app.api_surface}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
                        app.verdict.toLowerCase().includes('yes') ? 'bg-emerald-500/10 text-emerald-400' :
                        app.verdict.toLowerCase().includes('no') ? 'bg-rose-500/10 text-rose-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {app.verdict.toLowerCase().includes('yes') ? 'Yes' : 
                         app.verdict.toLowerCase().includes('no') ? 'No' : 'Gated'}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredApps.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No audited apps match the active filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Show</span>
              <select 
                value={pageSize} 
                onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-white/5 border border-white/5 rounded-lg px-2 py-1 text-[11px] text-foreground outline-none cursor-pointer"
              >
                <option value="15">15 rows</option>
                <option value="25">25 rows</option>
                <option value="50">50 rows</option>
                <option value="100">100 rows</option>
              </select>
              <span>of {filteredApps.length} entries</span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span className="font-semibold text-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </section>

        {/* Section 5: Verification System Staggered Reveal / Console */}
        <section id="pipeline" className="max-w-7xl mx-auto px-6 py-16 border-t border-border/40">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            
            {/* Left: Explanations */}
            <div>
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">04 / Verification</span>
              <h2 className="text-4xl font-normal mt-2 text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Interactive Verification Loop.
              </h2>
              <p className="text-muted-foreground text-xs leading-relaxed mt-4">
                Verify accuracy in real time! Run the subprocess comparison generator to evaluate our multi-pass LLM validation checks against naive parser benchmarks.
              </p>

              <div className="mt-8 flex flex-col gap-6">
                
                {/* Gauge 1 */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-muted-foreground font-semibold">Naive Scraper Pass (Pass 1)</span>
                    <span className="text-rose-400 font-bold">{firstPassAcc.toFixed(1)}% Accuracy</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                      style={{ width: `${firstPassAcc}%` }}
                    ></div>
                  </div>
                </div>

                {/* Gauge 2 */}
                <div>
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-muted-foreground font-semibold">Audited Agent (Pass 2)</span>
                    <span className="text-emerald-400 font-bold">{agentAcc.toFixed(1)}% Accuracy</span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                      style={{ width: `${agentAcc}%` }}
                    ></div>
                  </div>
                </div>

              </div>

              <div className="mt-8">
                <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground">Human-in-the-loop Checks</h4>
                <ul className="text-xs text-muted-foreground mt-3 flex flex-col gap-2 list-disc list-inside leading-relaxed">
                  <li>Resolved offline scripts that look like SaaS endpoints.</li>
                  <li>Manually audited gated credentials schemas using official developer consoles.</li>
                  <li>Aligned HSL color templates to map custom dashboards seamlessly.</li>
                </ul>
              </div>
            </div>

            {/* Right: Terminal Console */}
            <div className="liquid-glass p-6 rounded-2xl flex flex-col justify-between min-h-[380px]">
              <div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">verify_agent.py</span>
                </div>

                {/* Terminal logs list */}
                <div 
                  id="verifyConsoleBox"
                  className="bg-black/45 rounded-lg p-4 font-mono text-[10px] text-muted-foreground h-52 overflow-y-auto border border-white/5 flex flex-col gap-1.5"
                >
                  {terminalLogs.length === 0 ? (
                    <div className="text-muted-foreground text-center py-12">
                      Terminal idle. Select a sample size and click Run Verification.
                    </div>
                  ) : (
                    terminalLogs.map((log, idx) => {
                      let color = "text-muted-foreground";
                      if (log.includes("PASS") || log.includes("Success")) color = "text-emerald-400";
                      else if (log.includes("FAIL") || log.includes("Error")) color = "text-rose-400";
                      else if (log.includes("DISCREPANCY") || log.includes("Warning")) color = "text-amber-400";
                      
                      return (
                        <div key={idx} className={color}>
                          {log}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action controller */}
              <div className="flex gap-4 items-center justify-between mt-4">
                <select 
                  value={sampleSize}
                  onChange={e => setSampleSize(e.target.value)}
                  disabled={verificationActive}
                  className="bg-white/5 border border-white/5 rounded-xl px-4 py-3.5 text-xs text-foreground outline-none cursor-pointer focus:border-border disabled:opacity-50"
                >
                  <option value="15">15 Apps (Sample)</option>
                  <option value="30">30 Apps (Medium)</option>
                  <option value="50">50 Apps (Large)</option>
                  <option value="100">All 100 Apps (Full)</option>
                </select>

                <button 
                  onClick={triggerLiveVerification}
                  disabled={verificationActive}
                  className="flex-1 bg-white text-black font-semibold text-xs py-3.5 px-6 rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {verificationActive ? "Running..." : "Run Verification"}
                  <Play className="w-3.5 h-3.5 fill-black" />
                </button>
              </div>

            </div>

          </div>
        </section>

        {/* Section 6: Footer */}
        <footer className="border-t border-border/40 py-16 text-center text-xs text-muted-foreground">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-lg tracking-tight text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>
              Atlas API<sup className="text-[10px]">®</sup>
            </div>
            <div>
              &copy; {new Date().getFullYear()} Atlas API Inc. Case Study Audited for Composio.
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </footer>

      </div>

      {/* Slide-out Sidebar Drawer Detail Panel */}
      {isDrawerOpen && selectedApp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
          {/* Drawer backdrop click closer */}
          <div className="absolute inset-0" onClick={() => setIsDrawerOpen(false)}></div>
          
          <div className="relative z-10 w-full max-w-lg bg-background border-l border-border/40 h-full p-8 flex flex-col justify-between overflow-y-auto animate-fade-rise">
            <div>
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-6">
                <div>
                  <h3 className="text-2xl font-normal text-foreground" style={{ fontFamily: "'Instrument Serif', serif" }}>{selectedApp.name}</h3>
                  <span className="text-[10px] bg-white/5 text-muted-foreground px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider mt-1.5 inline-block">{selectedApp.category}</span>
                </div>
                <button 
                  onClick={() => setIsDrawerOpen(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer text-lg"
                >
                  &times;
                </button>
              </div>

              <div className="flex flex-col gap-6">
                
                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">One-Line Profile</h4>
                  <p className="text-xs text-foreground leading-relaxed">{selectedApp.one_liner}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Authentication Methods</h4>
                  <p className="text-xs text-foreground font-mono bg-white/5 rounded-lg p-2">{selectedApp.auth}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Gating Status</h4>
                  <p className="text-xs text-foreground leading-relaxed">{selectedApp.gating}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">API Surface Area</h4>
                  <p className="text-xs text-foreground leading-relaxed">{selectedApp.api_surface}</p>
                </div>

                <div>
                  <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Buildability Verdict</h4>
                  <p className="text-xs text-foreground leading-relaxed">{selectedApp.verdict}</p>
                </div>

                {/* Composio Code Snippet Generator */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Composio Toolkit Snippet</h4>
                    <button 
                      onClick={() => handleCopyCode(getCodeSnippet(selectedApp))}
                      className="text-[10px] font-semibold text-foreground hover:opacity-90 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="bg-black/45 rounded-lg p-4 font-mono text-[10px] text-muted-foreground border border-white/5 overflow-x-auto">
                    <code>{getCodeSnippet(selectedApp)}</code>
                  </pre>
                </div>

              </div>
            </div>

            <div className="mt-8 pt-4 border-t border-white/5">
              <a 
                href={selectedApp.evidence} 
                target="_blank" 
                rel="noreferrer"
                className="w-full bg-white/5 hover:bg-white/10 text-foreground py-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-colors border border-white/5"
              >
                <span>Open Official API Docs</span>
                <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
