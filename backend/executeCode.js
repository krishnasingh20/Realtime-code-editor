import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const executeCode = (language, code) => {
  return new Promise((resolve, reject) => {
    let tempFile;
    let className = "Main";

    // Handle Java separately to match class name
    if (language === "java") {
      const classMatch = code.match(/public\s+class\s+(\w+)/);
      className = classMatch ? classMatch[1] : "Main";
      tempFile = path.join(__dirname, `${className}.java`);
    } else {
      tempFile = path.join(__dirname, `temp.${getFileExtension(language)}`);
    }

    fs.writeFileSync(tempFile, code);

    let command;
    switch (language) {
      case "javascript":
        command = `node ${tempFile}`;
        break;
      case "python":
        command = `python ${tempFile}`;
        break;
      case "cpp":
        command = `g++ ${tempFile} -o ${__dirname}/temp.exe && ${__dirname}/temp.exe`;
        break;
      case "java":
        command = `javac ${tempFile} && java -cp ${__dirname} ${className}`;
        break;
      default:
        return reject(new Error("Unsupported language"));
    }

    exec(command, (error, stdout, stderr) => {
      try {
        fs.unlinkSync(tempFile);
        if (language === "java") {
          const classFile = path.join(__dirname, `${className}.class`);
          if (fs.existsSync(classFile)) fs.unlinkSync(classFile);
        }
      } catch {}

      if (error) {
        return resolve({ output: "", error: stderr || error.message });
      }
      resolve({ output: stdout });
    });
  });
};

function getFileExtension(language) {
  switch (language) {
    case "javascript":
      return "js";
    case "python":
      return "py";
    case "cpp":
      return "cpp";
    case "java":
      return "java";
    default:
      throw new Error("Unsupported language");
  }
}