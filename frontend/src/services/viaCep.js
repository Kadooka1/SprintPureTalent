import axios from 'axios';

export async function fetchAddressByCep(rawCep) {
  const cep = rawCep.replace(/[^\d]/g, '');
  if (cep.length !== 8) throw new Error('CEP deve ter 8 dígitos.');

  const { data } = await axios.get(`https://viacep.com.br/ws/${cep}/json/`);
  if (data.erro) throw new Error('CEP não encontrado.');

  return {
    street: data.logradouro || '',
    city:   data.localidade  || '',
    state:  data.uf          || '',
  };
}
