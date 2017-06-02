import cluster from "cluster";
import path from "path";

const defaultOptions = {
  script: "server.js",
  nodeArgs: [],
  args: []
};

export default class ReloadServerPlugin {
  constructor({ script, nodeArgs = [], args = [] } = defaultOptions) {
    this.done = null;
    this.workers = [];
    const execArgv = this._getArgs(nodeArgs, args);

    cluster.setupMaster({
      exec: path.resolve(process.cwd(), script),
      execArgv
    });

    cluster.on("online", (worker) => {
      this.workers.push(worker);

      if (this.done) {
        this.done();
      }
    });
  }

  _getArgs(nodeArgs, args) {
    let execArgv = [...nodeArgs, ...process.execArgv];
    if (args.length > 0) {
      execArgv.push('--');
      execArgv = [...execArgv, ...args];
    }
    return execArgv;
  }

  apply(compiler) {
    compiler.plugin("after-emit", (compilation, callback) => {
      this.done = callback;
      this.workers.forEach((worker) => {
        try {
          process.kill(worker.process.pid, "SIGTERM");
        } catch (e) {
          console.warn(`Unable to kill process #${worker.process.pid}`);
        }
      });

      this.workers = [];

      cluster.fork();
    });
  }
}
