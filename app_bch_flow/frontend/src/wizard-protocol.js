import {binToHex, hexToBin, publicKeyToP2pkhLockingBytecode, decodeTransaction, encodeTransaction} from '@bitauth/libauth';
import {sourceOutputToRelay} from '@wizardconnect/core/hdwalletv1-serialize';

// The SDK owns pairing/encryption. This adapter only maps the server's reserved plan.
export function walletSigningRequest(plan, wallet) {
  if (plan.broadcast !== false || !Array.isArray(plan.inputPaths) || !plan.inputPaths.length || plan.inputPaths.length > 100 || plan.publicKeys?.length !== plan.inputPaths.length || plan.sourceOutputs?.length !== plan.inputPaths.length) throw new Error('invalid_plan');
  const decoded=decodeTransaction(hexToBin(plan.transaction));
  if(typeof decoded==='string'||decoded.inputs.length!==plan.inputPaths.length)throw new Error('invalid_plan');
  const sources = plan.sourceOutputs.map((source, i) => {
    const [inputIndex, path, addressIndex] = plan.inputPaths[i];
    if (inputIndex !== i || !['receive','change'].includes(path) || !Number.isSafeInteger(addressIndex) || addressIndex < 0 || addressIndex >= 2**31) throw new Error('invalid_path');
    const vin=decoded.inputs[i];
    if(binToHex(vin.outpointTransactionHash)!==source.txid||vin.outpointIndex!==source.vout||vin.sequenceNumber!==source.sequenceNumber)throw new Error('invalid_source');
    const key = wallet.getPubkey(path === 'receive' ? 0 : 1, BigInt(addressIndex));
    if (!key || binToHex(key) !== plan.publicKeys[i]) throw new Error('wrong_wallet');
    const script = publicKeyToP2pkhLockingBytecode({publicKey:key});
    if (binToHex(script) !== source.lockingBytecode || !/^[0-9a-f]{64}$/.test(source.txid) || !Number.isInteger(source.vout) || source.vout < 0 || !/^[0-9]{1,16}$/.test(source.valueSatoshis) || BigInt(source.valueSatoshis) <= 0n) throw new Error('invalid_source');
    return sourceOutputToRelay({outpointTransactionHash:hexToBin(source.txid),outpointIndex:source.vout,sequenceNumber:source.sequenceNumber,unlockingBytecode:new Uint8Array(),lockingBytecode:script,valueSatoshis:BigInt(source.valueSatoshis)});
  });
  return {transaction:{transaction:plan.transaction,sourceOutputs:sources,broadcast:false,userPrompt:'BCH Flow · review destination, change and fee'},inputPaths:plan.inputPaths};
}

export function validateSignedResponse(unsignedHex, signedHex) {
  if (typeof signedHex !== 'string' || !/^(?:[0-9a-fA-F]{2}){1,100000}$/.test(signedHex)) throw new Error('invalid_signed_transaction');
  const unsigned = decodeTransaction(hexToBin(unsignedHex));
  const signed = decodeTransaction(hexToBin(signedHex));
  if (typeof unsigned === 'string' || typeof signed === 'string' || unsigned.inputs.length !== signed.inputs.length) throw new Error('invalid_signed_transaction');
  const stripped = {...signed, inputs:signed.inputs.map((input,i)=>({...input,unlockingBytecode:unsigned.inputs[i].unlockingBytecode}))};
  if (binToHex(encodeTransaction(stripped)) !== unsignedHex.toLowerCase()) throw new Error('changed_transaction');
  return signedHex;
}
