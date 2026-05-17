import { useState } from "react";

const tabs = [
  { id: "home", label: "HOME" },
  { id: "treino", label: "TREINO/CAMP" },
  { id: "loja", label: "LOJA" },
  { id: "sobre", label: "SOBRE NÓS" },
  { id: "contato", label: "CONTATO" },
];

const BRAND_BLUE = "#07b7b4";
const BRAND_YELLOW = "#ecd414";
const BRAND_BLACK = "#0a0a0a";

export function PaginaComAbas() {
  const [activeTab, setActiveTab] = useState("home");

  return (
    <div className="min-h-screen bg-white flex flex-col" style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* Top Alert */}
      <div style={{ background: BRAND_YELLOW, color: BRAND_BLACK }} className="text-xs py-2 text-center font-semibold">
        🏆 Participa e concorra a um PC Gamer + Kit Periféricos + Troféu!
      </div>

      {/* Header / Nav */}
      <header className="sticky top-0 z-50 bg-white shadow-md">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div style={{ background: BRAND_BLUE }} className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm">X</div>
            <span className="font-bold text-lg" style={{ color: BRAND_BLACK }}>XTREINO FREITAS</span>
          </div>

          {/* Tab Nav */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                style={{
                  background: activeTab === tab.id ? BRAND_BLUE : "transparent",
                  color: activeTab === tab.id ? "#fff" : BRAND_BLACK,
                  borderBottom: activeTab === tab.id ? `3px solid ${BRAND_YELLOW}` : "3px solid transparent",
                }}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Login button */}
          <button style={{ background: BRAND_BLUE }} className="px-5 py-2 rounded-lg text-white text-sm font-bold">
            LOGIN
          </button>
        </div>

        {/* Tab indicator bar */}
        <div className="h-0.5 w-full" style={{ background: "#f0f0f0" }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              background: BRAND_YELLOW,
              width: `${100 / tabs.length}%`,
              marginLeft: `${(tabs.findIndex(t => t.id === activeTab) / tabs.length) * 100}%`,
            }}
          />
        </div>
      </header>

      {/* Tab Content */}
      <main className="flex-1">
        {/* HOME */}
        {activeTab === "home" && (
          <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl font-bold leading-tight mb-6" style={{ color: BRAND_BLACK }}>
                ELEVE SEU <span style={{ color: BRAND_BLUE }}>GAME</span> AO<br />
                PRÓXIMO <span style={{ color: BRAND_BLUE }}>NÍVEL</span>
              </h1>
              <p className="text-gray-600 text-lg mb-8">
                Treinamento eSports de alta performance para jogadores profissionais e aspirantes.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab("treino")}
                  style={{ background: BRAND_BLUE }}
                  className="px-8 py-3 rounded-lg text-white font-bold text-base"
                >
                  COMEÇAR AGORA
                </button>
                <button
                  onClick={() => setActiveTab("sobre")}
                  className="px-8 py-3 rounded-lg font-bold text-base border-2"
                  style={{ borderColor: BRAND_YELLOW, color: BRAND_BLACK }}
                >
                  SAIBA MAIS
                </button>
              </div>
            </div>
            <div className="rounded-2xl overflow-hidden aspect-video bg-gray-100 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <div className="text-5xl mb-2">▶</div>
                <p className="text-sm font-semibold">Vídeo de Apresentação</p>
              </div>
            </div>
          </div>
        )}

        {/* TREINO/CAMP */}
        {activeTab === "treino" && (
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-2" style={{ color: BRAND_BLUE }}>Treino e Campeonatos</h2>
              <p className="text-gray-500">Eventos de Segunda a Sexta</p>
            </div>
            <div className="grid grid-cols-4 gap-5">
              {["Camp Freitas Season 4", "XTreino Freitas", "Modo Liga", "Semanal Freitas"].map((name, i) => (
                <div key={i} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-video bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                    <span className="text-gray-500 text-sm font-semibold">🎮</span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-sm mb-2" style={{ color: BRAND_BLACK }}>{name}</h3>
                    <p className="text-xs text-gray-500 mb-3">Segunda a Sexta • 14h às 23h</p>
                    <button style={{ background: BRAND_BLUE }} className="w-full py-2 rounded-lg text-white text-xs font-bold">
                      RESERVAR VAGA
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* LOJA */}
        {activeTab === "loja" && (
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-2" style={{ color: BRAND_BLUE }}>LOJA VIRTUAL</h2>
              <p className="text-gray-500">Produtos físicos e digitais para elevar sua performance</p>
            </div>
            <div className="grid grid-cols-5 gap-4">
              {["Sensibilidade Pro", "Passe Premium", "Kit Treino", "Camiseta Org", "Tokens 10x"].map((name, i) => (
                <div key={i} className="rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-2xl">🛒</span>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-xs mb-1">{name}</h3>
                    <p className="text-xs text-gray-400 mb-2">R$ {(i + 1) * 9},90</p>
                    <button style={{ background: BRAND_BLUE }} className="w-full py-1.5 rounded text-white text-xs font-bold">
                      COMPRAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOBRE NÓS */}
        {activeTab === "sobre" && (
          <div className="max-w-6xl mx-auto px-6 py-14">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-2" style={{ color: BRAND_BLUE }}>SOBRE NÓS</h2>
              <p className="text-gray-500 max-w-2xl mx-auto">Conheça a história, os objetivos e a metodologia por trás do X-TREINO FREITAS</p>
            </div>

            {/* Sub-tabs dentro de Sobre */}
            <div className="flex gap-2 justify-center mb-10">
              {["Quem Somos", "FAQ", "Nossa Equipe", "Patrocinadores"].map((sub, i) => (
                <button
                  key={i}
                  className="px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all"
                  style={{ borderColor: BRAND_BLUE, color: i === 0 ? "#fff" : BRAND_BLUE, background: i === 0 ? BRAND_BLUE : "transparent" }}
                >
                  {sub}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-10 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: BRAND_BLUE }}>Quem Somos</h3>
                <p className="text-gray-600 leading-relaxed mb-6">
                  Somos uma organização focada em treinos de alto desempenho, desenvolvimento de talentos e formação de equipes vencedoras no cenário eSports.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-3xl font-bold mb-1" style={{ color: BRAND_YELLOW }}>+900</div>
                    <div className="text-xs text-gray-500">Equipes por semana</div>
                  </div>
                  <div className="text-center p-4 rounded-xl border border-gray-100 shadow-sm">
                    <div className="text-3xl font-bold mb-1" style={{ color: BRAND_YELLOW }}>50+</div>
                    <div className="text-xs text-gray-500">Pro-Players Formados</div>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl p-8 text-center" style={{ background: `${BRAND_BLUE}18` }}>
                <div className="text-5xl mb-4">🏆</div>
                <h4 className="text-xl font-bold mb-3">Metodologia Comprovada</h4>
                <p className="text-gray-600 text-sm">Desenvolvemos uma metodologia única que combina treinamento técnico, análise estratégica e preparação mental.</p>
              </div>
            </div>
          </div>
        )}

        {/* CONTATO */}
        {activeTab === "contato" && (
          <div className="max-w-4xl mx-auto px-6 py-14">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-bold mb-2" style={{ color: BRAND_BLUE }}>CONTATO</h2>
              <p className="text-gray-500">Entre em contato para dúvidas, suporte ou parcerias</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-6" style={{ color: BRAND_BLUE }}>Informações</h3>
                <div className="space-y-4">
                  {[
                    { icon: "📱", label: "WhatsApp", val: "(19) 9 9787-0816" },
                    { icon: "📸", label: "Instagram", val: "@OrgFreitas" },
                    { icon: "▶", label: "YouTube", val: "@OrganizaçãoFreitas" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <p className="text-xs text-gray-400 font-semibold">{item.label}</p>
                        <p className="text-sm font-bold text-gray-700">{item.val}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
                <h3 className="text-xl font-bold mb-6" style={{ color: BRAND_BLUE }}>Enviar Mensagem</h3>
                <div className="space-y-4">
                  <input placeholder="Seu nome" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <input placeholder="Seu e-mail" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400" />
                  <textarea placeholder="Sua mensagem" rows={4} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none" />
                  <button style={{ background: BRAND_BLUE }} className="w-full py-3 rounded-lg text-white font-bold text-sm">
                    ENVIAR MENSAGEM
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        © 2025 XTreino Freitas · Todos os direitos reservados
      </footer>
    </div>
  );
}
