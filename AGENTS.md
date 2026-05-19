# Project Conventions

## General Code Quality & Anti-Laziness Rule
You are **ABSOLUTELY FORBIDDEN** to be lazy. Always strive to do a little more than the minimum requested, but NEVER a little less. When writing tests (especially E2E tests), you MUST write comprehensive tests covering multiple logic paths, complex state changes, and corner/edge cases. Do not write superficial or "check-the-box" tests. For example, when testing collections/lists, verify individual mutations, sequences, state persistence (like undo/redo interactions), and ensure operations don't falsely wipe out sibling data.

## Testing & DOM Selectors
When writing tests or E2E simulations (e.g., using `Simulator.ts`), **NEVER** use brittle CSS selectors like `.classname`, `div:has-text()`, or index-based paths.
You **MUST** use `data-testid` attributes on interactive or queryable HTML elements.
*   **Good**: `data-testid="my-button"`
*   **Bad**: `className="my-button"`, `> div > span`

Always update the React components to include `data-testid` attributes before trying to target them in tests.

## Запуск E2E тестов (ЗАПРЕЩЕНО)
Вам **СТРОГО ЗАПРЕЩЕНО** пытаться запускать E2E тесты самостоятельно (через скрипты, браузерные автоматизаторы, playwright, puppeteer и т.д.). E2E тесты запускаются исключительно пользователем вручную. Никогда не тратьте время на их автоматический запуск или написание краулеров.

## Правила именования коммитов (Conventional Commits & SemVer)

Все коммиты должны строго следовать спецификации Conventional Commits, что позволяет автоматизировать управление версиями по принципам Семантического Версионирования (SemVer).

**Формат коммита:**
```
<тип>([необязательный контекст]): <описание>

[необязательное тело коммита]

[необязательный футер с указанием BREAKING CHANGE]
```

**Допустимые типы коммитов:**
- `feat`: Новая функциональность (влияет на MINOR версию в SemVer).
- `fix`: Исправление ошибки, бага (влияет на PATCH версию в SemVer).
- `docs`: Изменения исключительно в документации (README, комментарии к коду и т.п.).
- `style`: Изменения, не влияющие на логику кода (расстановка пробелов, форматирование, точки с запятой).
- `refactor`: Переписывание кода без добавления нового функционала или исправления багов (рефакторинг).
- `perf`: Изменения только улучшающие производительность кода.
- `test`: Добавление новых тестов или корректировка существующих.
- `chore`: Задачи по обслуживанию, обновление зависимостей, рутинные обновления проекта (не затрагивающие продуктовый код).
- `build`: Внесение изменений, влияющих на процесс сборки проекта или внешние зависимости (npm, vite).
- `ci`: Правки в конфигурации или скриптах CI/CD (GitHub Actions и т.д.).

**Мажорные изменения (Breaking Changes) — MAJOR в SemVer:**
Любой коммит, содержащий обратно несовместимые (ломающие) изменения, должен содержать `!` после типа или контекста (например, `feat!: <описание>` или `refactor(api)!: <описание>`). Также допустимо писать `BREAKING CHANGE: <описание>` в тексте/футере коммита. Этот шаг обязателен для изменения MAJOR-версии пакета.

**Правила написания описания:**
1. Используйте повелительное наклонение (например: `add`, `change`, `fix`, `remove`).
2. Пишите со строчной буквы.
3. Не ставьте точку в конце описания.
