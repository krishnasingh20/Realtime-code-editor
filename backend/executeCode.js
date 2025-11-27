import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const getFileExtension = (language) => {
  const extensions = {
    javascript: "js",
    python: "py",
    cpp: "cpp",
    java: "java",
  };
  return extensions[language] || null;
};

const getExecutionCommand = (language, tempFile, className) => {
  const commands = {
    javascript: `node ${tempFile}`,
    python: `python ${tempFile}`,
    cpp: `g++ ${tempFile} -o ${__dirname}/temp.exe && ${__dirname}/temp.exe`,
    java: `javac ${tempFile} && java -cp ${__dirname} ${className}`,
  };
  return commands[language] || null;
};

export const executeCode = (language, code) => {
  return new Promise((resolve, reject) => {
    const extension = getFileExtension(language);
    if (!extension) {
      return reject(new Error("Unsupported language"));
    }

    let tempFile;
    let className = "Main";

    if (language === "java") {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      className = classMatch ? classMatch[1] : "Main";
      tempFile = path.join(__dirname, `${className}.java`);
    } else {
      tempFile = path.join(__dirname, `temp.${extension}`);
    }

    try {
      fs.writeFileSync(tempFile, code);
    } catch (error) {
      return reject(new Error("Failed to write temp file"));
    }

    const command = getExecutionCommand(language, tempFile, className);
    if (!command) {
      return reject(new Error("Unsupported language"));
    }

    const timeout = setTimeout(() => {
      try {
        fs.unlinkSync(tempFile);
        if (language === "java") {
          const classFile = path.join(__dirname, `${className}.class`);
          if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
        }
      } catch (e) {
        // Cleanup error ignored
      }
      resolve({ output: "", error: "Execution timeout" });
    }, 10000);

    exec(command, (error, stdout, stderr) => {
      clearTimeout(timeout);

      try {
        fs.unlinkSync(tempFile);
        if (language === "java") {
          const classFile = path.join(__dirname, `${className}.class`);
          if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
        }
      } catch (e) {
        // Cleanup error ignored
      }

      if (error) {
        return resolve({ output: "", error: stderr || error.message });
      }
      resolve({ output: stdout });
    });
  });
};