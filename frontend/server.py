from flask import Flask, redirect, send_from_directory

app = Flask(__name__)

@app.route("/", methods=["GET"])
def serve_static_index_0():
    return redirect("/app/index.html", 302)

@app.route("/app", methods=["GET"])
def serve_static_index_1():
    return redirect("/app/index.html", 302)

@app.route("/app/<path:path>", methods=["GET"])
def serve_static_any(path):
    if path == 'index.html':
        return send_from_directory(".", path)
    return send_from_directory("./dist", path)

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=8001, debug=True)