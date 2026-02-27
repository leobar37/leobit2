import { spawn } from 'child_process';

const child = spawn('bun', ['run', 'db:generate']);

let output = '';
let responseSent = false;

child.stdout.on('data', (data) => {
  output += data.toString();
  console.log(data.toString());
  
  // Look for the prompt
  if (!responseSent && output.includes('Is avatar_id column')) {
    console.log('\n>>> Sending response: Select first option (create column)');
    child.stdin.write('\n');
    responseSent = true;
  }
});

child.stderr.on('data', (data) => {
  console.error(data.toString());
});

child.on('close', (code) => {
  console.log(`\nProcess exited with code ${code}`);
});
