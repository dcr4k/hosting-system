# Digit4lKey StayOS v2.0 — Plataforma SaaS Multi-Tenant de Reservas e Gestão de Hospedagem

Plataforma SaaS profissional para comercialização de reservas e gestão de hotéis, pousadas e hostels, estruturada em **Cloud Firestore** e **Firebase Authentication** com isolamento rigoroso por `tenantId`.

---

## 1. Visão Geral dos Três Ambientes Integrados

1. **Ambiente A — Administrador da Plataforma (`Admin SaaS`)**:
   - Governança central de todos os estabelecimentos (`tenants`), ativação/suspensão de contas, gestão de planos comerciais (`Inicial`, `Profissional`, `Avançado`), estimativa de receita recorrente (MRR), trilha de auditoria imutável (`audit_logs`) e **Provisionamento Automático Idempotente** de novos clientes.
2. **Ambiente B — Administrador do Estabelecimento (`Gestão do Estabelecimento`)**:
   - Dashboard operacional em tempo real (ocupação do dia, quartos livres vs. camas livres, check-ins, check-outs e receita recebida vs. prevista).
   - CRUD completo de acomodações (quartos privativos, suítes de casal, chalés familiares, dormitórios compartilhados mistos e femininos) e unidades físicas/camas numeradas.
   - **Calendário Interativo por Unidade/Cama** + **Cadastro Rápido em Lote** (disponibilização de períodos, cópia para múltiplas acomodações, regras recorrentes por dia da semana e bloqueios de manutenção/feriados).
   - Motor de tarifas sazonais com ordem de prioridade explícita.
   - Central de reservas (confirmação, check-in, check-out, cancelamento com liberação automática de inventário).
   - Base de hóspedes com conformidade LGPD e mascaramento de dados pessoais para operadores de recepção (`tenant_staff`).
   - Demonstrativo financeiro e exportação de relatórios em **CSV**.
   - Personalização visual do portal público (cores, descrição, horários e políticas).
3. **Ambiente C — Portal Público do Hóspede (`Portal do Hóspede`)**:
   - Identidade visual dinâmica por estabelecimento.
   - Pesquisa por período e quantidade de hóspedes com cálculo em tempo real no motor de disponibilidade.
   - Escolha visual de quarto ou cama específica em dormitórios compartilhados.
   - Transação atômica no Firestore (`runTransaction`) prevenindo reservas simultâneas sobre a mesma unidade/cama e garantindo idempotência (`idempotencyKey`).
   - Comprovante de reserva consultável por código único (`DK-...`) com integrações **Google Calendar**, **WhatsApp**, **Google Maps**, **Web Share API** e instalação **PWA**.

---

## 2. Instalação e Execução Local

```bash
# 1. Instalar dependências
npm install

# 2. Executar servidor de desenvolvimento (porta 3000)
npm run dev

# 3. Validar regras de segurança do Firestore
npx eslint firestore.rules

# 4. Gerar build de produção (inclui Service Worker e Manifest PWA)
npm run build
```

---

## 3. Configuração Firebase e Variáveis de Ambiente

- O arquivo `firebase-applet-config.json` contém as credenciais públicas do aplicativo web provisionado no Firebase (`projectId`, `appId`, `apiKey`, `firestoreDatabaseId`).
- As regras de segurança Zero-Trust estão definidas em `firestore.rules` e documentadas em `firebase-blueprint.json` e `security_spec.md`.
