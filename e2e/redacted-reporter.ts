import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class RedactedReporter implements Reporter {
  onTestEnd(test:TestCase,result:TestResult) {
    console.log(`${result.status}: ${test.title}`);
    for (const error of result.errors) {
      let message=error.message??'Staging test failed.';
      for (const name of ['TEAM_PULSE_TEST_ADMIN_PASSWORD','TEAM_PULSE_TEST_EMPLOYEE_PASSWORD','TEAM_PULSE_TEST_PUBLISHABLE_KEY']) {
        const value=process.env[name];
        if (value) message=message.replaceAll(value,'[redacted]');
      }
      console.error(message);
    }
  }
}
