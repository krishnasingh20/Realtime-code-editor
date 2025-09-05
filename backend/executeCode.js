import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Executes the given code in the selected language.
 * @param {string} language - "javascript" | "python" | "cpp" | "java"
 * @param {string} code - The source code to execute.
 * @returns {Promise<{output: string, error?: string}>}
 */
export const executeCode = (language, code) => {
  return new Promise((resolve, reject) => {
    const tempFile = path.join(__dirname, `temp.${getFileExtension(language)}`);

    // ✅ Write code to temp file
    fs.writeFileSync(tempFile, code);

    // ✅ Command to run based on language
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
        command = `javac ${tempFile} && java -cp ${__dirname} ${path.basename(tempFile, ".java")}`;
        break;
      default:
        return reject(new Error("Unsupported language"));
    }

    // ✅ Execute the code
    exec(command, (error, stdout, stderr) => {
      fs.unlinkSync(tempFile); // delete temp file

      if (error) {
        resolve({ output: "", error: stderr || error.message });
      } else {
        resolve({ output: stdout });
      }
    });
  });
};

/** Returns file extension based on language */
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
