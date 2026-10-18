# Security Policy

## Safe Execution Design

Mini (`minilang`) is designed with safety by default:
- **Zero `eval()`**: Mini never invokes JavaScript's `eval()` or `new Function()`. All code is tokenized, parsed into an AST, and interpreted explicitly.
- **No Arbitrary Filesystem/Network Access in `.mini` Scripts**: The core language runtime has no built-in primitives for shell execution, filesystem mutation, or network requests.
- **Configurable Resource Limits**:
  - `maxLoopIterations` (default: `100,000` per loop, CLI `--max-iterations`)
  - `maxCallDepth` (default: `1,000` frames, CLI `--max-depth`)
  - `maxExecutionTimeMs` (default: `5,000` ms, CLI `--timeout`)
  - `maxOutputLines` (default: `10,000` lines)

## Supported Versions

| Version | Supported |
| :--- | :--- |
| `1.0.x` | :white_check_mark: Yes |

## Reporting a Vulnerability

If you discover a security vulnerability (such as a sandbox escape, denial-of-service bypass in the parser/interpreter, or dependency issue), please report it privately to `habeebrahmanca07@gmail.com` or via GitHub Private Vulnerability Reporting before disclosing it publicly.

