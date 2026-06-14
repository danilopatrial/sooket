import type { NodeVersionRegistry } from "./types";

import { execute as workflowInput } from "./workflow-input";
import { execute as boolean_      } from "./boolean";
import { execute as text          } from "./text";
import { execute as number_       } from "./number";
import { execute as tokenCounter  } from "./token-counter";
import { execute as xmlJson       } from "./xml-json";
import { execute as typeCast      } from "./type-cast";
import { execute as datetime      } from "./datetime";
import { execute as stringOps     } from "./string-ops";
import { execute as nullCheck     } from "./null-check";
import { execute as arrayLength   } from "./array-length";
import { execute as sizeOf        } from "./size-of";
import { execute as concat        } from "./concat";
import { execute as math          } from "./math";
import { execute as regexReplace  } from "./regex-replace";
import { execute as pick          } from "./pick";
import { execute as piiRedact     } from "./pii-redact";
import { execute as templateString} from "./template-string";
import { execute as jsonBuilder   } from "./json-builder";
import { execute as jsonParser      } from "./json-parser";
import { execute as if_            } from "./if";
import { execute as router         } from "./router";
import { execute as abSplit        } from "./ab-split";
import { execute as languageDetect } from "./language-detect";
import { execute as sentiment      } from "./sentiment";
import { execute as merge           } from "./merge";
import { execute as responseBuilder } from "./response-builder";
import { execute as accessList      } from "./access-list";
import { execute as listManager     } from "./list-manager";
import { execute as complexity      } from "./complexity";
import { execute as webhook         } from "./webhook";
import { execute as httpRequest     } from "./http-request";
import { execute as vectorUpsert    } from "./vector-upsert";
import { execute as vectorSearch    } from "./vector-search";
import { execute as cache_          } from "./cache";
import { execute as semanticCache   } from "./semantic-cache";
import { execute as tryCatch        } from "./try-catch";
import { execute as retry           } from "./retry";
import { execute as rateLimiter     } from "./rate-limiter";
import { execute as anthropic       } from "./anthropic";
import { execute as openai          } from "./openai";
import { execute as contentGuardrail} from "./content-guardrail";
import { execute as schemaValidator} from "./schema-validator";
import { execute as promptCompression}from "./prompt-compression";
import { execute as authValidator   } from "./auth-validator";
import { execute as customCode      } from "./custom-code";
import { execute as subWorkflow     } from "./sub-workflow";

// To add a breaking change to a node:
// 1. Add v2 executor: "anthropic": { 1: anthropicV1, 2: anthropicV2 }
// 2. New canvas nodes default to typeVersion: 2
// 3. Existing workflows stay on typeVersion: 1 (or undefined → 1) automatically
export const NODE_EXECUTOR_REGISTRY: NodeVersionRegistry = {
  "workflowInput":  { 1: workflowInput },
  "boolean":        { 1: boolean_ },
  "text":           { 1: text },
  "number":         { 1: number_ },
  "token-counter":  { 1: tokenCounter },
  "xml-json":       { 1: xmlJson },
  "type-cast":      { 1: typeCast },
  "datetime":       { 1: datetime },
  "string-ops":     { 1: stringOps },
  "null-check":     { 1: nullCheck },
  "array-length":   { 1: arrayLength },
  "size-of":        { 1: sizeOf },
  "concat":         { 1: concat },
  "math":           { 1: math },
  "regex-replace":  { 1: regexReplace },
  "pick":           { 1: pick },
  "pii-redact":     { 1: piiRedact },
  "template-string":{ 1: templateString },
  "json-builder":   { 1: jsonBuilder },
  "json-parser":    { 1: jsonParser },
  "if":             { 1: if_ },
  "router":         { 1: router },
  "ab-split":       { 1: abSplit },
  "language-detect":{ 1: languageDetect },
  "sentiment":      { 1: sentiment },
  "merge":          { 1: merge },
  "response-builder":{ 1: responseBuilder },
  "access-list":    { 1: accessList },
  "list-manager":   { 1: listManager },
  "complexity":     { 1: complexity },
  "webhook":        { 1: webhook },
  "http-request":   { 1: httpRequest },
  "vector-upsert":  { 1: vectorUpsert },
  "vector-search":  { 1: vectorSearch },
  "cache":          { 1: cache_ },
  "semantic-cache": { 1: semanticCache },
  "try-catch":      { 1: tryCatch },
  "retry":          { 1: retry },
  "rate-limiter":   { 1: rateLimiter },
  "anthropic":      { 1: anthropic },
  "openai":         { 1: openai },
  "content-guardrail":  { 1: contentGuardrail },
  "schema-validator":   { 1: schemaValidator },
  "prompt-compression": { 1: promptCompression },
  "auth-validator":     { 1: authValidator },
  "custom-code":        { 1: customCode },
  "sub-workflow":       { 1: subWorkflow },
};
