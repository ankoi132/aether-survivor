import * as esbuild from 'esbuild';

try {
  await esbuild.build({
    entryPoints: ['src/main.js'],
    bundle: true,
    outfile: 'bundle.js',
    format: 'iife',
    sourcemap: true
  });
  console.log('✓ Build completata: bundle.js generato con successo.');
} catch (err) {
  console.error('Errore durante la build:', err);
  process.exit(1);
}
