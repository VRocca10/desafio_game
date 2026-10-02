# Review failure traces

These traces document findings before the corresponding fixes. They do not
represent the outcome of the final accepted suite.

- landscape-before-fix.zip: orientation check failed because legacy grid placement
  positioned landscape touch buttons outside the viewport. The landscape footer
  and control container now use explicit positioning.
- scenario-selector-before-update.zip: old substring label selection matched
  both the newly introduced dialog and the scenario selector. The selector now
  has an explicit associated label and tests select the exact combobox role/name.
- deployed-smoke.zip: public deployment check failed because the deployed menu
  did not contain the local Controls button. deployed-smoke.json also records
  differing production bundle URLs. Recheck after the final push/deployment.

Open a trace with `npx playwright show-trace <path-to-zip>`.
