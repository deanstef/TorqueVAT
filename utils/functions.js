function roundToDecimals(num, decimals) {
  let factor_ten = Math.pow(10, decimals);
  return Math.round(num * factor_ten) / factor_ten;
}
function roundAlgoAssetToDecimal(num, decimals) {
  let factor_ten = Math.pow(10, decimals);
  return Math.round(num * factor_ten);
}
function addAlgoAssetDecimals(num, decimals) {
    let factor_ten = Math.pow(10, decimals);
    return num/factor_ten;
  }

module.exports = {
    roundToDecimals,
    roundAlgoAssetToDecimal,
    addAlgoAssetDecimals
}