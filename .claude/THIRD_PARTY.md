# Software de terceros incluido en `.claude/`

Estas skills son instrucciones (y, en el caso de Taste Skill, scripts de Node) escritas por otras
personas y copiadas tal cual en `.claude/skills/`. Se revisaron antes de instalarlas: las de Emil son solo
Markdown; Taste Skill lanza un Chrome local sin interfaz, descarga imágenes con licencia de APIs públicas
(Wikimedia, Met, NASA…) y guarda un historial en `~/.taste-skill/history.json`; no ejecuta código remoto ni
envía datos. No se usaron `install.sh` ni `npx skills add`: la copia es idéntica (verificada con `diff -r`)
al commit indicado. Para actualizar, vuelve a clonar, **revisa el cambio** y copia de nuevo.

| Skills | Origen | Commit auditado | Licencia |
|---|---|---|---|
| `emil-design-eng`, `animate`, `animation-performance`, `animation-vocabulary`, `apple-design`, `break-ui`, `find-animation-opportunities`, `improve-animations`, `mobile-native`, `pick-ui-library`, `prototype`, `review-animations` | https://github.com/emilkowalski/skills | `2d228630ba1446365f614a108cb8252f1feda202` (2026-10-11) | MIT © 2026 Emil Kowalski |
| `design-taste-frontend` (carpeta `skills/taste-skill` del repo) | https://github.com/Leonxlnx/taste-skill | `12af471f627f866411b4bd785b19646d3672784c` (2026-10-25, v2.1.5) | MIT © 2026 Leonxlnx |

Omitidas a propósito por no aplicar a este proyecto (Vue, no Swift/Expo/React): `write-swift`, `animate-expo`, `ask-sonner`.

Servidores MCP (`.mcp.json`): `@playwright/mcp` (Microsoft, https://github.com/microsoft/playwright-mcp, versión fijada),
Figma remoto (`https://mcp.figma.com/mcp`) y Figma de escritorio (`http://127.0.0.1:3845/mcp`). Ninguno guarda secretos en el repositorio.

---

## Texto de las licencias

### emilkowalski/skills

MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Leonxlnx/taste-skill

MIT License

Copyright (c) 2026 Leonxlnx

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
