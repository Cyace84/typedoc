import { Logger, LogLevel, removeIf } from "../lib/utils";
import { deepStrictEqual as equal, fail } from "assert";
import * as ts from "typescript";
import { resolve } from "path";

const levelMap: Record<LogLevel, string> = {
    [LogLevel.Error]: "error: ",
    [LogLevel.Warn]: "warn: ",
    [LogLevel.Info]: "info: ",
    [LogLevel.Verbose]: "debug: ",
};

export class TestLogger extends Logger {
    messages: string[] = [];

    reset() {
        this.resetErrors();
        this.resetWarnings();
        this.messages = [];
    }

    discardDebugMessages() {
        removeIf(this.messages, (msg) => msg.startsWith("debug"));
    }

    expectMessage(message: string) {
        const regex = createRegex(message);
        const index = this.messages.findIndex((m) => regex.test(m));
        if (index === -1) {
            const messages = this.messages.join("\n\t") || "(none logged)";
            fail(
                `Expected "${message}" to be logged. The logged messages were:\n\t${messages}`
            );
        }
        this.messages.splice(index, 1);
    }

    expectNoOtherMessages() {
        equal(this.messages, [], "Expected no other messages to be logged.");
    }

    override diagnostic(diagnostic: ts.Diagnostic): void {
        const output = ts.formatDiagnostic(diagnostic, {
            getCanonicalFileName: resolve,
            getCurrentDirectory: () => process.cwd(),
            getNewLine: () => ts.sys.newLine,
        });

        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Error:
                this.log(output, LogLevel.Error);
                break;
            case ts.DiagnosticCategory.Warning:
                this.log(output, LogLevel.Warn);
                break;
            case ts.DiagnosticCategory.Message:
                this.log(output, LogLevel.Info);
        }
    }

    override log(message: string, level: LogLevel): void {
        super.log(message, level);
        this.messages.push(levelMap[level] + message);
    }
}

function createRegex(s: string) {
    return new RegExp(
        [
            "^",
            s.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[\\s\\S]*"),
            "$",
        ].join("")
    );
}
