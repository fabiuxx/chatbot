import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

import postcss from "rollup-plugin-postcss";
import terser from '@rollup/plugin-terser';
import gzip from 'rollup-plugin-gzip';

export default {
  input: ['./src/App.tsx'],
  output: {
    dir: 'dist',
    format: 'system'
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: 'tsconfig.json', sourceMap: true }),
    postcss(),
    terser(),
    gzip()
  ],
  external: ['react', 'react-dom'],
};