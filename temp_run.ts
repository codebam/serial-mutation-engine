import { base85_to_deserialized } from './dist/api.js';

const serial = '@Ugydj=2}TYg41n&T3U#PNHEPIE8dOQtNYqSJ7*r@!7}Pn`NYqT!NYqT!NYqT!NYqSJE>xm!p;DqoqDrE/pzfglphBT?q1vGmm8e{(Kd3mUbf{aXTc}&8Tc}&8Tc}&8Tc}&8Tc}&8Td1QRXi<w=)S?!(s6{PmQHMIzp$>JZLq#+$E-o%EA}%g2E-o%6A}%g2E-nrL';
const deserialized = base85_to_deserialized(serial);
console.log(deserialized);
