"use strict";

// GVT - EA4: Parametrisierte Flächen
// Helikoid und Möbiusband

// START EA4_HELIKOID

function createHelicoidVertexData() {
    const n = 48;
    const m = 16;

    const vertices = new Float32Array(
        3 * (n + 1) * (m + 1)
    );

    const indices = new Uint16Array(
        2 * (n * (m + 1) + (n + 1) * m)
    );

    let iIndex = 0;

    for (let i = 0; i <= n; i++) {
        const t = -Math.PI + i * (2 * Math.PI / n);

        for (let j = 0; j <= m; j++) {
            const r = -0.7 + j * (1.4 / m);
            const iVertex = i * (m + 1) + j;

            // Parametrisierung des Helikoids
            const x = r * Math.cos(t);
            const y = 0.18 * t;
            const z = r * Math.sin(t);

            vertices[iVertex * 3] = x;
            vertices[iVertex * 3 + 1] = y;
            vertices[iVertex * 3 + 2] = z;

            // Linien entlang des Radius
            if (j > 0) {
                indices[iIndex++] = iVertex - 1;
                indices[iIndex++] = iVertex;
            }

            // Linien entlang des Winkels
            if (i > 0) {
                indices[iIndex++] = iVertex - (m + 1);
                indices[iIndex++] = iVertex;
            }
        }
    }

    return {
        vertices,
        indices,
        triangles: createTriangleIndices(n, m)
    };
}

// END EA4_HELIKOID

// START EA4_MOEBIUSBAND

function createMobiusVertexData() {
    const n = 64;
    const m = 16;

    const vertices = new Float32Array(
        3 * (n + 1) * (m + 1)
    );

    const indices = new Uint16Array(
        2 * (n * (m + 1) + (n + 1) * m)
    );

    let iIndex = 0;

    for (let i = 0; i <= n; i++) {
        const u = i * 2 * Math.PI / n;

        for (let j = 0; j <= m; j++) {
            const v = -0.22 + j * 0.44 / m;
            const iVertex = i * (m + 1) + j;

            // Parametrisierung des Möbiusbandes
            const r = 0.6 + v * Math.cos(u / 2);

            const x = r * Math.cos(u);
            const y = r * Math.sin(u);
            const z = v * Math.sin(u / 2);

            vertices[iVertex * 3] = x;
            vertices[iVertex * 3 + 1] = y;
            vertices[iVertex * 3 + 2] = z;

            // Linien entlang der Bandbreite
            if (j > 0) {
                indices[iIndex++] = iVertex - 1;
                indices[iIndex++] = iVertex;
            }

            // Linien entlang des Bandes
            if (i > 0) {
                indices[iIndex++] = iVertex - (m + 1);
                indices[iIndex++] = iVertex;
            }
        }
    }

    return {
        vertices,
        indices,
        triangles: createTriangleIndices(n, m)
    };
}

// END EA4_MOEBIUSBAND

// START EA4_EIGENE_PARAMETRISIERUNG

function createFlowerVertexData() {
   
    const n = 96;
    const m = 24;

    const vertices = new Float32Array(
        3 * (n + 1) * (m + 1)
    );

    const indices = new Uint16Array(
        2 * (n * (m + 1) + (n + 1) * m)
    );

    let iIndex = 0;

    for (let i = 0; i <= n; i++) {
        const t = i * 2 * Math.PI / n;

        for (let j = 0; j <= m; j++) {
            const r = j / m;
            const iVertex = i * (m + 1) + j;

            // Eigene Parametrisierung: Wellenblüte
            const radius = 0.64 * r *
                (1 + 0.22 * r * Math.cos(7 * t));

            const winkel = t + 0.3 * r;

            const x = radius * Math.cos(winkel);
            const z = radius * Math.sin(winkel);

            const y = 0.36 * (1 - r * r)
                + 0.18 * r * r * Math.cos(7 * t + 0.3 * r)
                - 0.14;

            vertices[iVertex * 3] = x;
            vertices[iVertex * 3 + 1] = y;
            vertices[iVertex * 3 + 2] = z;

            if (j > 0) {
                indices[iIndex++] = iVertex - 1;
                indices[iIndex++] = iVertex;
            }

            if (i > 0) {
                indices[iIndex++] = iVertex - (m + 1);
                indices[iIndex++] = iVertex;
            }
        }
    }

    return {
        vertices,
        indices,
        triangles: createTriangleIndices(n, m)
    };
}

// END EA4_EIGENE_PARAMETRISIERUNG

// START EA4_FUELLUNG

// Jede Gittermasche wird in zwei Dreiecke aufgeteilt.
function createTriangleIndices(n, m) {
    const triangles = new Uint16Array(6 * n * m);

    let k = 0;

    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            const d = i * (m + 1) + j;

            const a = d - (m + 1) - 1;
            const b = d - (m + 1);
            const c = d - 1;

            // Erstes Dreieck
            triangles[k++] = a;
            triangles[k++] = c;
            triangles[k++] = b;

            // Zweites Dreieck
            triangles[k++] = b;
            triangles[k++] = c;
            triangles[k++] = d;
        }
    }

    return triangles;
}

// END EA4_FUELLUNG

// Shader erstellen und kompilieren
function createShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const message = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(message);
    }

    return shader;
}

// START EA4_WEBGL

function init() {
    const canvas = document.getElementById("glCanvas");
    const status = document.getElementById("status");
    const surfaceTitle = document.getElementById("surfaceTitle");
    const switchButton = document.getElementById("switchSurface");

    if (!canvas || !status || !surfaceTitle || !switchButton) {
        console.error("Benötigte HTML-Elemente fehlen.");
        return;
    }

    const gl = canvas.getContext("webgl");

    if (!gl) {
        status.textContent = "WebGL wird nicht unterstützt.";
        return;
    }

    try {

        // Vertex-Shader

        const vertexShader = createShader(
            gl,
            gl.VERTEX_SHADER,
            `
            attribute vec3 pos;
            varying float vHeight;
            varying float vRadius;

            void main() {
                // Drehung um die X-Achse
                float angle = radians(35.0);

                float x = pos.x;
                float y = pos.y * cos(angle)
                        - pos.z * sin(angle);
                float z = pos.y * sin(angle)
                        + pos.z * cos(angle);

                // Höhenwert für den Farbverlauf
                vHeight = clamp(
                    (y + 0.9) / 1.8,
                    0.0,
                    1.0
                );
                vRadius = clamp(length(pos.xz) / 0.8, 0.0, 1.0);
                gl_Position = vec4(x, y, z, 1.0);
            }
            `
        );

        // Fragment-Shader
        
const fragmentShader = createShader(
    gl,
    gl.FRAGMENT_SHADER,
    `
    precision mediump float;

    varying float vHeight;
    varying float vRadius;

    uniform float uSurface;
    uniform float uLines;

    void main() {
        vec3 color;

        if (uSurface < 0.5) {
            // Helikoid: Blau bis Türkis
            color = mix(
                vec3(0.05, 0.25, 0.75),
                vec3(0.15, 0.90, 0.75),
                vHeight
            );

        } else if (uSurface < 1.5) {
            // Möbiusband: Violett bis Rosa
            color = mix(
                vec3(0.40, 0.15, 0.75),
                vec3(1.00, 0.48, 0.55),
                vHeight
            );

        } else {
    // START EA4_WELLENBLUETE_FARBVERLAUF

    // Goldgelb im Zentrum
    vec3 center = vec3(1.00, 0.80, 0.40);

    // Orange im mittleren Bereich
    vec3 middle = vec3(1.00, 0.48, 0.29);

    // Dunkles Pink an den Blütenrändern
    vec3 outer = vec3(0.79, 0.15, 0.40);

    color = mix(
        center,
        middle,
        smoothstep(0.0, 0.6, vRadius)
    );

    color = mix(
        color,
        outer,
        smoothstep(0.55, 1.0, vRadius)
    );

    // END EA4_WELLENBLUETE_FARBVERLAUF
}

        // Linienfarben
        if (uLines > 0.5) {
            if (uSurface < 0.5) {
                color = vec3(0.65, 0.95, 1.0);
            } else if (uSurface < 1.5) {
                color = vec3(1.0, 0.95, 0.8);
            } else {
    // Dunklere Linien bei gefüllter Wellenblüte
    // Helle Linien im reinen Linienmodus
    color = uLines > 1.5
        ? vec3(1.0, 0.90, 0.75)
        : vec3(0.55, 0.16, 0.31);
}
        }

        gl_FragColor = vec4(color, 1.0);
    }
    `
);

        // Shader-Programm

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error(gl.getProgramInfoLog(program));
        }

        gl.useProgram(program);

        const posLocation = gl.getAttribLocation(program, "pos");

        const uSurface = gl.getUniformLocation(
            program, "uSurface"
        );

        const uLines = gl.getUniformLocation(
            program, "uLines"
        );

        // WebGL-Buffer

        const vertexBuffer = gl.createBuffer();
        const indexBuffer = gl.createBuffer();
        const triangleBuffer = gl.createBuffer();

        // WebGL-Einstellungen
        
        gl.viewport(0, 0, canvas.width, canvas.height);

        gl.clearColor(0.06, 0.09, 0.15, 1.0);
        gl.clearDepth(1.0);

        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);

        // Beide Seiten der Flächen darstellen
        gl.disable(gl.CULL_FACE);

        // Flächen vorbereiten
        
        const surfaces = [
            {
                name: "Helikoid (Wendelfläche)",
                data: createHelicoidVertexData()
            },
            {
                name: "Möbiusband",
                data: createMobiusVertexData()
            },
            {
                name: "Wellenblüte (Eigenkreation)",
                data: createFlowerVertexData()
            }
        ];

        let currentSurface = 0;

        // START EA4_DARSTELLUNGSMODUS
        let showFill = true;
        // END EA4_DARSTELLUNGSMODUS

        // START EA4_FARBIGE_FLAECHEN
        // Fläche zeichnen

        function drawSurface(data, surfaceNumber) {

            gl.useProgram(program);

            // Vertex-Buffer aktualisieren
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

            gl.bufferData(
                gl.ARRAY_BUFFER,
                data.vertices,
                gl.STATIC_DRAW
            );

            gl.enableVertexAttribArray(posLocation);

            gl.vertexAttribPointer(
                posLocation,
                3,
                gl.FLOAT,
                false,
                0,
                0
            );

            // Bildschirm löschen
            gl.clear(
                gl.COLOR_BUFFER_BIT |
                gl.DEPTH_BUFFER_BIT
            );

            // Aktuelle Fläche auswählen
            gl.uniform1f(uSurface, surfaceNumber);

            // Gefüllte Dreiecke zeichnen
            gl.bindBuffer(
                gl.ELEMENT_ARRAY_BUFFER,
                triangleBuffer
            );

            gl.bufferData(
                gl.ELEMENT_ARRAY_BUFFER,
                data.triangles,
                gl.STATIC_DRAW
            );

            gl.uniform1f(uLines, 0.0);

            // Tiefenversatz gegen Überlagerungsfehler
            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(1.0, 1.0);

            // START EA4_FUELLUNG_UMSCHALTEN
            if (showFill) {
                gl.drawElements(
                    gl.TRIANGLES,
                    data.triangles.length,
                    gl.UNSIGNED_SHORT,
                    0
                );
            }
            // END EA4_FUELLUNG_UMSCHALTEN

            gl.disable(gl.POLYGON_OFFSET_FILL);

            // Liniengitter darüber zeichnen
            gl.bindBuffer(
                gl.ELEMENT_ARRAY_BUFFER,
                indexBuffer
            );

            gl.bufferData(
                gl.ELEMENT_ARRAY_BUFFER,
                data.indices,
                gl.STATIC_DRAW
            );

            gl.uniform1f(uLines, showFill ? 1.0 : 2.0);

            gl.drawElements(
                gl.LINES,
                data.indices.length,
                gl.UNSIGNED_SHORT,
                0
            );
        }

        // END EA4_FARBIGE_FLAECHEN

        // Beschriftungen aktualisieren
        function updateInfo() {
            const surface = surfaces[currentSurface];
            const data = surface.data;

            surfaceTitle.textContent =
                (currentSurface + 1) + ". " + surface.name;

            status.textContent =
                surface.name + ": " +
                data.vertices.length / 3 + " Vertices, " +
                data.indices.length / 2 + " Liniensegmente.";
        }

        // START EA4_FLAECHENWECHSEL

        // Zwischen den Flächen wechseln
        function switchSurface() {
            currentSurface =
                (currentSurface + 1) % surfaces.length;

            drawSurface(
                surfaces[currentSurface].data,
                currentSurface
            );

            updateInfo();
        }

        // Umschaltung per Button
        switchButton.addEventListener(
            "click",
            switchSurface
        );

        // Umschaltung per Taste B
        document.addEventListener("keydown", function(event) {
            if (
                event.key.toLowerCase() === "b" &&
                !event.repeat
            ) {
                switchSurface();
            }
        });

        // END EA4_FLAECHENWECHSEL

        // START EA4_DARSTELLUNG_UMSCHALTEN

        const toggleViewButton =
            document.getElementById("toggleView");

        function toggleView() {
            showFill = !showFill;

            // Aktuelle Fläche neu zeichnen
            drawSurface(
                surfaces[currentSurface].data,
                currentSurface
            );

            // Buttontext aktualisieren
            toggleViewButton.textContent = showFill
                ? "Nur Linien anzeigen (L)"
                : "Füllung + Linien anzeigen (L)";
        }

        // Umschaltung per Button
        toggleViewButton.addEventListener(
            "click",
            toggleView
        );

        // Umschaltung per Taste L
        document.addEventListener("keydown", function(event) {
            if (
                event.key.toLowerCase() === "l" &&
                !event.repeat
            ) {
                toggleView();
            }
        });

        // END EA4_DARSTELLUNG_UMSCHALTEN

        // Erste Fläche beim Start anzeigen
        drawSurface(surfaces[0].data, 0);
        updateInfo();

    } catch (error) {
        console.error(error);
        status.textContent = "Fehler: " + error.message;
    }
}
// END EA4_WEBGL
// Anwendung starten
document.addEventListener("DOMContentLoaded", init);