var mongoose = require('mongoose');
var bcrypt   = require('bcrypt-nodejs');

var userSchema = mongoose.Schema({
 
    name: String,
    surname: String,
    passaport_id: String,
    email: String,
    password: String,
    role: String,

    algo_address: String,
    algo_mnemonic: String,

    latest_time_vat_claim: Number // date


}, { timestamps: { createdAt: 'created_at' } });

userSchema.methods.generateHash = function(password) {
  return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
  return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
