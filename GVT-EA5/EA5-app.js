
"use strict";

// ========================================================
// GVT - Einsendeaufgabe 5
// Kamerabewegung und rekursive Kugel
// ========================================================


// START EA5 - WebGL Initialisierung

const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");

if (!gl) {
    throw new Error("WebGL konnte nicht initialisiert werden.");
}

if (typeof mat4 === "undefined") {
    throw new Error("Die glMatrix-Bibliothek wurde nicht geladen.");
}

gl.enable(gl.DEPTH_TEST);
gl.depthFunc(gl.LEQUAL);
gl.clearColor(0.06, 0.08, 0.14, 1.0);

// END EA5 - WebGL Initialisierung


// START EA5 - Shader

const vertexShaderSource = `
    attribute vec3 aPosition;
    attribute vec3 aNormal;

    uniform mat4 uProjection;
    uniform mat4 uView;
    uniform mat4 uModel;

    varying float vLight;

    void main() {
        vec3 normal = normalize(mat3(uModel) * aNormal);
        vec3 lightDirection = normalize(vec3(-0.4, 0.8, 0.6));

        vLight = 0.3 + 0.7 *
            max(dot(normal, lightDirection), 0.0);

        gl_Position =
            uProjection * uView * uModel *
            vec4(aPosition, 1.0);
    }
`;

const fragmentShaderSource = `
    precision mediump float;

    uniform vec3 uColor;
    uniform float uLighting;

    varying float vLight;

    void main() {
        float brightness = mix(1.0, vLight, uLighting);
        gl_FragColor = vec4(uColor * brightness, 1.0);
    }
`;

function compileShader(type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error("Shader-Fehler: " + error);
    }

    return shader;
}

const vertexShader = compileShader(
    gl.VERTEX_SHADER,
    vertexShaderSource
);

const fragmentShader = compileShader(
    gl.FRAGMENT_SHADER,
    fragmentShaderSource
);

const program = gl.createProgram();

gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

gl.useProgram(program);

gl.deleteShader(vertexShader);
gl.deleteShader(fragmentShader);

const aPosition = gl.getAttribLocation(program, "aPosition");
const aNormal = gl.getAttribLocation(program, "aNormal");

const uProjection = gl.getUniformLocation(program, "uProjection");
const uView = gl.getUniformLocation(program, "uView");
const uModel = gl.getUniformLocation(program, "uModel");
const uColor = gl.getUniformLocation(program, "uColor");
const uLighting = gl.getUniformLocation(program, "uLighting");

// END EA5 - Shader


// START EA5 - Geometrieerzeugung

// Speichert Position und Normale eines Vertex.
function addVertex(data, position, normal) {
    data.push(
        position[0], position[1], position[2],
        normal[0], normal[1], normal[2]
    );
}

// Speichert ein Dreieck aus drei Vertices.
function addTriangle(data, a, b, c) {
    for (const v of [a, b, c]) {
        addVertex(data, v.position, v.normal);
    }
}

function vertex(position, normal) {
    return { position, normal };
}


// --------------------------------------------------------
// Grundkörper 1: Kegel
// --------------------------------------------------------

function createConeData() {
    const data = [];
    const segments = 48;
    const radius = 0.8;
    const top = 1.1;
    const bottom = -1.0;

    function sideNormal(angle) {
        const slope = radius / (top - bottom);
        const length = Math.sqrt(1 + slope * slope);

        return [
            Math.cos(angle) / length,
            slope / length,
            Math.sin(angle) / length
        ];
    }

    for (let i = 0; i < segments; i++) {
        const a = i * 2 * Math.PI / segments;
        const b = (i + 1) * 2 * Math.PI / segments;

        const p1 = [
            radius * Math.cos(a),
            bottom,
            radius * Math.sin(a)
        ];

        const p2 = [
            radius * Math.cos(b),
            bottom,
            radius * Math.sin(b)
        ];

        // Mantelfläche.
        addTriangle(
            data,
            vertex([0, top, 0], sideNormal((a + b) / 2)),
            vertex(p2, sideNormal(b)),
            vertex(p1, sideNormal(a))
        );

        // Bodenfläche.
        const down = [0, -1, 0];

        addTriangle(
            data,
            vertex([0, bottom, 0], down),
            vertex(p1, down),
            vertex(p2, down)
        );
    }

    return data;
}


// --------------------------------------------------------
// Grundkörper 2: Torus
// --------------------------------------------------------

function createTorusData() {
    const data = [];

    const majorRadius = 0.95;
    const minorRadius = 0.32;

    const segmentsU = 48;
    const segmentsV = 24;

    function torusVertex(u, v) {
        const cosU = Math.cos(u);
        const sinU = Math.sin(u);
        const cosV = Math.cos(v);
        const sinV = Math.sin(v);

        const r = majorRadius + minorRadius * cosV;

        return vertex(
            [
                r * cosU,
                r * sinU,
                minorRadius * sinV
            ],
            [
                cosU * cosV,
                sinU * cosV,
                sinV
            ]
        );
    }

    for (let i = 0; i < segmentsU; i++) {
        for (let j = 0; j < segmentsV; j++) {
            const u0 = i * 2 * Math.PI / segmentsU;
            const u1 = (i + 1) * 2 * Math.PI / segmentsU;

            const v0 = j * 2 * Math.PI / segmentsV;
            const v1 = (j + 1) * 2 * Math.PI / segmentsV;

            const a = torusVertex(u0, v0);
            const b = torusVertex(u1, v0);
            const c = torusVertex(u1, v1);
            const d = torusVertex(u0, v1);

            addTriangle(data, a, b, c);
            addTriangle(data, a, c, d);
        }
    }

    return data;
}


// --------------------------------------------------------
// Vertex-Buffer erstellen
// --------------------------------------------------------

function createMesh(data) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(data),
        gl.STATIC_DRAW
    );

    return {
        buffer: buffer,
        count: data.length / 6
    };
}

// Die beiden Grundkörper initialisieren.
const cone = createMesh(createConeData());
const torus = createMesh(createTorusData());

// END EA5 - Geometrieerzeugung


// START EA5 - Rekursive Kugel

let recursionDepth = 2;

const maxRecursionDepth = 5;
const sphereRadius = 0.78;

let sphereSolid = null;
let sphereLines = null;


// --------------------------------------------------------
// Mittelpunkt berechnen und normieren
// --------------------------------------------------------

function normalizeMidpoint(a, b) {
    const x = (a[0] + b[0]) / 2;
    const y = (a[1] + b[1]) / 2;
    const z = (a[2] + b[2]) / 2;

    const length = Math.sqrt(x*x + y*y + z*z);

    return [
        x / length,
        y / length,
        z / length
    ];
}


// --------------------------------------------------------
// Dreieckskanten als Linien speichern
// --------------------------------------------------------

function addSphereLine(data, a, b) {
    addVertex(
        data,
        a.map(v => v * sphereRadius),
        a
    );

    addVertex(
        data,
        b.map(v => v * sphereRadius),
        b
    );
}


// --------------------------------------------------------
// Rekursive Unterteilung eines Dreiecks
// --------------------------------------------------------

function subdivideTriangle(a, b, c, depth, solid, lines) {
    // Rekursionsabbruch.
    if (depth === 0) {
        addTriangle(
            solid,
            vertex(a.map(v => v * sphereRadius), a),
            vertex(b.map(v => v * sphereRadius), b),
            vertex(c.map(v => v * sphereRadius), c)
        );

        addSphereLine(lines, a, b);
        addSphereLine(lines, b, c);
        addSphereLine(lines, c, a);

        return;
    }

    // Mittelpunkte der drei Kanten.
    const ab = normalizeMidpoint(a, b);
    const bc = normalizeMidpoint(b, c);
    const ca = normalizeMidpoint(c, a);

    // Vier neue Dreiecke erzeugen.
    subdivideTriangle(a, ab, ca, depth - 1, solid, lines);
    subdivideTriangle(ab, b, bc, depth - 1, solid, lines);
    subdivideTriangle(ca, bc, c, depth - 1, solid, lines);
    subdivideTriangle(ab, bc, ca, depth - 1, solid, lines);
}


// --------------------------------------------------------
// Ausgangsmodell: Oktaeder mit 8 Dreiecken
// --------------------------------------------------------

function createRecursiveSphere(depth) {
    const solid = [];
    const lines = [];

    const top = [0, 1, 0];
    const bottom = [0, -1, 0];

    const east = [1, 0, 0];
    const west = [-1, 0, 0];
    const north = [0, 0, 1];
    const south = [0, 0, -1];

    const faces = [
        [top, north, east],
        [top, west, north],
        [top, south, west],
        [top, east, south],

        [bottom, east, north],
        [bottom, north, west],
        [bottom, west, south],
        [bottom, south, east]
    ];

    for (const face of faces) {
        subdivideTriangle(
            face[0],
            face[1],
            face[2],
            depth,
            solid,
            lines
        );
    }

    return { solid, lines };
}


// --------------------------------------------------------
// Rekursive Kugel neu erzeugen
// --------------------------------------------------------

function rebuildSphere() {
    // Alte GPU-Buffer freigeben.
    if (sphereSolid) {
        gl.deleteBuffer(sphereSolid.buffer);
    }

    if (sphereLines) {
        gl.deleteBuffer(sphereLines.buffer);
    }

    const data = createRecursiveSphere(recursionDepth);

    sphereSolid = createMesh(data.solid);
    sphereLines = createMesh(data.lines);

    const triangleCount = 8 * Math.pow(4, recursionDepth);

    document.getElementById("recursionInfo").textContent =
        "Tiefe: " + recursionDepth +
        " | Dreiecke: " + triangleCount;

    document.getElementById("decreaseDepth").disabled =
        recursionDepth === 0;

    document.getElementById("increaseDepth").disabled =
        recursionDepth === maxRecursionDepth;

    console.log(
        "Rekursionstiefe:", recursionDepth,
        "| Dreiecke:", triangleCount
    );
}

// END EA5 - Rekursive Kugel


// START EA5 - Kamerabewegung

const camera = {
    angle: 0.4,
    distance: 8.0,
    height: 2.5,
    center: [0, 0, 0],
    up: [0, 1, 0]
};

const projectionMatrix = mat4.create();
const viewMatrix = mat4.create();
const modelMatrix = mat4.create();

function updateCamera() {
    // Kameraposition auf der Kreisbahn berechnen.
    const eye = [
        camera.center[0] +
            camera.distance * Math.sin(camera.angle),

        camera.center[1] + camera.height,

        camera.center[2] +
            camera.distance * Math.cos(camera.angle)
    ];

    // View-Transformation.
    mat4.lookAt(
        viewMatrix,
        eye,
        camera.center,
        camera.up
    );

    // Perspektivische Projektion.
    
// START EA5 - Automatische Anpassung des Sichtfeldes

// Referenzhöhe für die normale Kameraansicht.
const referenceHeight = 2.5;
const baseFov = Math.PI / 4;

// Entfernung bei Referenzhöhe und aktueller Höhe.
const referenceDistance = Math.hypot(
    camera.distance,
    referenceHeight
);

const actualDistance = Math.hypot(
    camera.distance,
    camera.height
);

// Öffnungswinkel an die Kamerahöhe anpassen.
const adjustedFov = 2 * Math.atan(
    Math.tan(baseFov / 2) *
    referenceDistance / actualDistance
);

mat4.perspective(
    projectionMatrix,
    adjustedFov,
    gl.drawingBufferWidth / gl.drawingBufferHeight,
    0.1,
    100
);

// END EA5 - Automatische Anpassung des Sichtfeldes

}

// END EA5 - Kamerabewegung


// START EA5 - Rendering

function drawMesh(mesh, color, position, mode = gl.TRIANGLES) {
    mat4.fromTranslation(modelMatrix, position);

    gl.uniformMatrix4fv(uModel, false, modelMatrix);
    gl.uniform3f(uColor, color[0], color[1], color[2]);

    // Bei Linien keine Beleuchtungsabdunklung.
    gl.uniform1f(
        uLighting,
        mode === gl.LINES ? 0.0 : 1.0
    );

    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);

    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(
        aPosition, 3, gl.FLOAT, false, 24, 0
    );

    gl.enableVertexAttribArray(aNormal);
    gl.vertexAttribPointer(
        aNormal, 3, gl.FLOAT, false, 24, 12
    );

    gl.drawArrays(mode, 0, mesh.count);
}


function render() {
    gl.viewport(
        0,
        0,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight
    );

    gl.clear(
        gl.COLOR_BUFFER_BIT |
        gl.DEPTH_BUFFER_BIT
    );

    updateCamera();

    gl.uniformMatrix4fv(
        uProjection, false, projectionMatrix
    );

    gl.uniformMatrix4fv(
        uView, false, viewMatrix
    );

    // Kegel links.
    drawMesh(
        cone,
        [1.0, 0.55, 0.2],
        [-2.2, 0, 0]
    );

    // Torus rechts.
    drawMesh(
        torus,
        [0.2, 0.7, 1.0],
        [2.3, 0, 0]
    );

    // Rekursive Kugel in der Mitte.
    const spherePosition = [0, 0, -0.2];

    // Polygon-Offset für das Dreiecksnetz.
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.0, 1.0);

    drawMesh(
        sphereSolid,
        [0.75, 0.45, 1.0],
        spherePosition
    );

    gl.disable(gl.POLYGON_OFFSET_FILL);

    // Optional das Drahtgitter anzeigen.
    if (document.getElementById("showWireframe").checked) {
        drawMesh(
            sphereLines,
            [0.95, 0.95, 1.0],
            spherePosition,
            gl.LINES
        );
    }

    // Kamerawerte auf der Webseite aktualisieren.
    const degrees = (
        camera.angle * 180 / Math.PI % 360 + 360
    ) % 360;

    document.getElementById("cameraStatus").textContent =
        "Kamerawinkel: " + degrees.toFixed(1) + "°" +
        " | Radius: " + camera.distance.toFixed(1) +
        " | Höhe: " + camera.height.toFixed(1);
}

// END EA5 - Rendering


// START EA5 - Tastaturinteraktion

window.addEventListener("keydown", function(event) {
    const stepAngle = 5 * Math.PI / 180;
    const stepHeight = 1.0;
    const stepDistance = 0.4;

    switch (event.key) {
        case "ArrowLeft":
            camera.angle -= stepAngle;
            break;

        case "ArrowRight":
            camera.angle += stepAngle;
            break;

        
case "ArrowUp":
    camera.height = Math.min(
        camera.height + stepHeight,
        30
    );
    break;

case "ArrowDown":
    camera.height = Math.max(
        camera.height - stepHeight,
        -30
    );
    break;


        default:
            if (event.key.toLowerCase() === "n") {
                if (event.shiftKey) {
                    camera.distance = Math.min(
                        camera.distance + stepDistance,
                        16
                    );
                } else {
                    camera.distance = Math.max(
                        camera.distance - stepDistance,
                        5.4
                    );
                }
            } else {
                return;
            }
    }

    event.preventDefault();
    render();
});

// END EA5 - Tastaturinteraktion


// START EA5 - Rekursionstiefe steuern

document.getElementById("increaseDepth")
    .addEventListener("click", function() {
        if (recursionDepth < maxRecursionDepth) {
            recursionDepth++;
            rebuildSphere();
            render();
        }
    });

document.getElementById("decreaseDepth")
    .addEventListener("click", function() {
        if (recursionDepth > 0) {
            recursionDepth--;
            rebuildSphere();
            render();
        }
    });

document.getElementById("showWireframe")
    .addEventListener("change", function() {
        render();
    });

// END EA5 - Rekursionstiefe steuern


// START EA5 - Programmstart

rebuildSphere();
render();

console.log("EA5: WebGL-Szene erfolgreich initialisiert.");

// END EA5 - Programmstart