import { EditorView, basicSetup } from "https://esm.sh/codemirror@6.0.1";
import { Compartment } from "https://esm.sh/@codemirror/state@6";
import { keymap } from "https://esm.sh/@codemirror/view@6";
import { indentWithTab } from "https://esm.sh/@codemirror/commands@6";

import { oneDark } from "https://esm.sh/@codemirror/theme-one-dark@6";
import { tokyoNight } from "https://esm.sh/@uiw/codemirror-theme-tokyo-night@4";

import { javascript } from "https://esm.sh/@codemirror/lang-javascript@6";
import { python } from "https://esm.sh/@codemirror/lang-python@6";
import { cpp } from "https://esm.sh/@codemirror/lang-cpp@6";
import { java } from "https://esm.sh/@codemirror/lang-java@6";
import { rust } from "https://esm.sh/@codemirror/lang-rust@6";
import { go } from "https://esm.sh/@codemirror/lang-go@6";


async function encode(text) {
    const stream = new CompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    writer.write(new TextEncoder().encode(text));
    writer.close();

    const compressed = await new Response(stream.readable).arrayBuffer();
    const bytes = new Uint8Array(compressed);
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function decode(str) {
    const binary = atob(str.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));

    const stream = new DecompressionStream("deflate-raw");
    const writer = stream.writable.getWriter();
    writer.write(bytes);
    writer.close();

    const decompressed = await new Response(stream.readable).arrayBuffer();
    return new TextDecoder().decode(decompressed);
}

const langCompartment = new Compartment();

const view = new EditorView({
    parent: document.getElementById("editor"),
    extensions: [
        basicSetup,
        oneDark,
		langCompartment.of([]),
        keymap.of([indentWithTab]),
        EditorView.updateListener.of(async (update) => {
            if (update.docChanged) {
                const text = view.state.doc.toString();
                window.location.hash = await encode(text);
            }
        })
    ]
});

if (window.location.hash) {
    const text = await decode(window.location.hash.slice(1));
    view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text }
    });
}

document.getElementById("copy-btn").addEventListener("click", () => {
    navigator.clipboard.writeText(window.location.href);
    const btn = document.getElementById("copy-btn");
    btn.textContent = "✓";
    setTimeout(() => btn.textContent = "⎘", 1500);
});

const langs = {
    js: javascript(),
    py: python(),
    cpp: cpp(),
    c: cpp(),
    java: java(),
    rs: rust(),
    go: go(),
};

document.getElementById("lang-select").addEventListener("change", (e) => {
    const lang = langs[e.target.value] ?? [];
    view.dispatch({
        effects: langCompartment.reconfigure(lang)
    });
});

function toBase64(str) {
    return btoa(new TextEncoder().encode(str).reduce((s, b) => s + String.fromCharCode(b), ""));
}

function fromBase64(str) {
    return new TextDecoder().decode(Uint8Array.from(atob(str), c => c.charCodeAt(0)));
}

const judge0Langs = {
    cpp: 54,
    c: 50,
    java: 62,
    rs: 73,
    go: 60,
    py: 71,
    js: 63,
};

document.getElementById("run-btn").addEventListener("click", async () => {
    const langKey = document.getElementById("lang-select").value;
    const langId = judge0Langs[langKey];
	const stdinValue = document.getElementById("stdin-input").value;

    if (!langId) {
        document.getElementById("output").textContent = "Select a language first.";
        document.getElementById("output-panel").classList.remove("hidden");
        return;
    }

    document.getElementById("output").textContent = "Running...";
    document.getElementById("output-panel").classList.remove("hidden");

    const code = view.state.doc.toString();

    const submitRes = await fetch("https://ce.judge0.com/submissions?base64_encoded=true&wait=true", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			source_code: toBase64(code),
			language_id: langId,
			stdin: toBase64(stdinValue),
		})
	});

	const data = await submitRes.json();
	const stdout = data.stdout ? fromBase64(data.stdout) : null;
	const stderr = data.stderr ? fromBase64(data.stderr) : null;
	const compile_output = data.compile_output ? fromBase64(data.compile_output) : null;


	const output_d = document.getElementById("output");
	if (stdout) {
		output_d.style.color = "#9ece6a";
		output_d.textContent = stdout;
	} else if (compile_output) {
		output_d.style.color = "#f7768e";
		output_d.textContent = compile_output;
	} else if (stderr) {
		output_d.style.color = "#f7768e";
		output_d.textContent = stderr;
	} else {
		output_d.style.color = "#c0caf5";
		output_d.textContent = "No output.";
	}

	console.log(data);
});