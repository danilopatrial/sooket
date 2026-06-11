import type { Migration } from "../run-migrations";
import { migration as m001 } from "./001-init";
import { migration as m002 } from "./002-preset-headers-query";
import { migration as m003 } from "./003-access-list-rule-type";
import { migration as m004 } from "./004-customer-variables-workflow-id";
import { migration as m005 } from "./005-request-logs-api-key-id";
import { migration as m006 } from "./006-workflows-error-workflow-id";
import { migration as m007 } from "./007-workflows-pin-data";
import { migration as m008 } from "./008-workflows-static-data";
import { migration as m009 } from "./009-workflow-versions";
import { migration as m010 } from "./010-credentials";
import { migration as m011 } from "./011-workflow-api-keys-seed";
import { migration as m012 } from "./012-workflow-webhook-token";
import { migration as m013 } from "./013-seed-example-workflow";
import { migration as m014 } from "./014-hash-api-keys";
import { migration as m015 } from "./015-idempotency-keys";

export const ALL_MIGRATIONS: Migration[] = [
  m001, m002, m003, m004, m005, m006, m007, m008, m009, m010, m011, m012, m013, m014, m015,
];
