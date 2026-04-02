# 🧪 Teste Rápido - Sistema de Temas

## Como Testar

### 1. Iniciar a Aplicação
```bash
npm run dev:full
# ou
npm run dev
```

### 2. Fazer Login
- Usar credenciais válidas para entrar no dashboard

### 3. Ir para a Página de Perfil
```
Dashboard → Perfil (👤)
```

### 4. Procurar o Seletor de Temas
- Na **coluna da direita** (side-column)
- Após o card "A Minha Conta"
- Título: **"🎨 Escolha um Tema"**

### 5. Experimentar os Temas
- Clicar em cada tema
- Observar a mudança instantânea de cores
- Recarregar a página - o tema continua!

---

## O que Mudou Visualmente

### Elementos Afetados
- ✅ Sidebar (fundo + links)
- ✅ Página background
- ✅ Botões primários
- ✅ Cards e containers
- ✅ Inputs e formulários
- ✅ Tabelas
- ✅ Modais
- ✅ Badges e elementos pequenos

### O que NÃO Mudou
- ❌ Layout ou estrutura (design mantém-se intacto)
- ❌ Funcionamento (tudo funciona igual)
- ❌ Performance (na verdade, melhorou!)

---

## Temas para Testar

1. **Default** (Azul) - O padrão
2. **Primavera** (Verde/Teal) - Fresco
3. **Verão** (Amarelo/Dourado) - Quente
4. **Outono** (Laranja) - Aconchegante
5. **Inverno** (Ciano) - Frio
6. **Páscoa** (Rosa) - Festivo
7. **Natal** (Vermelho) - Festivo
8. **Religioso** (Roxo) - Solene

---

## Verificação Técnica

### Console do Navegador (F12)
```javascript
// Verificar tema atual
localStorage.getItem('app-theme')
// Saída: "default", "natal", etc.

// Verificar variáveis CSS
getComputedStyle(document.documentElement)
  .getPropertyValue('--color-btnPrimary')
// Saída: #2563eb, #dc2626, etc. (depende do tema)
```

### Mudança de Tema Programática (para debug)
```javascript
// No console do navegador
localStorage.setItem('app-theme', 'natal')
location.reload()
// A página recarrega com o tema do Natal
```

---

## Problemas Comuns

### ❓ O seletor não aparece
- Verifica se estás na página **Perfil**
- Downscroll até à coluna da direita
- Verifica a consola para erros (F12)

### ❓ As cores não mudam
1. Limpa o cache do navegador (Ctrl+Shift+Delete)
2. Verifica se há erros na consola
3. Verifica se o theme está no localStorage

### ❓ O tema não persiste après reload
- Verifica se o navegador permite localStorage
- Tenta em navegação normal (não privada)
- Limpa cookies e tenta novamente

---

## Dicas

- 💡 Usa o tema **Páscoa** para testar cores pastel
- 💡 Usa o tema **Natal** para testar vermelho/escuro
- 💡 Usa o tema **Religioso** para testar roxo/formal
- 💡 Abre o DevTools e muda de tema para ver via (F12 → Elements → html)

---

## Reset/Volta ao Padrão

Se quiseres voltar ao tema original:
```javascript
// Console do navegador
localStorage.removeItem('app-theme')
location.reload()
```

---

## Relatório de Teste

Preenche esta checklist após testar:

- [ ] Tema muda instantaneamente ao clicar
- [ ] Sidebar muda de cor
- [ ] Botões mudam de cor
- [ ] Cards/containers mudam de cor
- [ ] Tema persiste após reload
- [ ] Todos os 8 temas funcionam
- [ ] Sem erros na consola
- [ ] Sem flicker ou lag
- [ ] Design mantém-se intacto
- [ ] Todas as páginas funcionam com todos os temas

---

## 🚀 Status

**Ready to Test:** ✅ SIM  
**Data:** Abril 2026  
**Componentes:** 8 Temas Funcionais  

---

Para dúvidas, ver: `docs/SISTEMA_TEMAS.md`
