# Decisões técnicas

## Bloco A

- Regras puras de CPF, Price, comissão, permissões e transições ficam em `src/lib/domain.ts`; persistência e operações compostas ficam em serviços. Server Actions e páginas passam por `requireRole`. Isso mantém validações testáveis sem banco e evita autorização espalhada; descartamos concentrar regras em componentes ou actions.
- Clientes, propostas, parceiros, taxas e mudanças de status usam modelos relacionais Prisma/PostgreSQL. `ProposalStatusHistory` é o único registro de auditoria e cada mudança de status é gravada junto da atualização na mesma transação. Não criamos um log genérico duplicado.
- O fluxo de status é monotônico: Consulta → Digitação → Análise → Aprovada ou Recusada; apenas Aprovada pode virar Paga. Recusada e Paga são terminais. Descarta-se permitir saltos ou retrocessos para evitar comissão duplicada e trilhas ambíguas.
- Taxa mensal e prazo são copiados para a proposta na criação; percentual e valor da comissão são congelados ao pagar. Alterar configurações afeta somente operações futuras, preservando a reprodução dos cálculos históricos.
- CPF é validado por dígitos verificadores, normalizado para persistência e formatado na camada de apresentação; apenas ADMIN recebe o valor completo. O escopo dos parceiros é aplicado nos serviços, não apenas na interface.
- O seed usa nomes, e-mails `.local`/`.test`, CPFs matematicamente válidos e IDs de propostas determinísticos. São 50 clientes, 120 propostas e histórico sintético dos últimos seis meses; não há dados pessoais reais nem senha padrão no repositório.
- A autenticação sempre executa uma comparação bcrypt, inclusive para e-mail inexistente, usando um hash fictício no caminho negativo para reduzir diferenças temporais observáveis.
- A configuração ESLint usa flat config e `FlatCompat` com ignores explícitos para artefatos gerados, sem variáveis de ambiente específicas de shell que falham no Windows.

Alternativas descartadas: autorização somente no cliente; log paralelo de eventos; comissão/taxa recalculada a partir das configurações atuais; seed aleatório não reproduzível; senha de demonstração versionada.