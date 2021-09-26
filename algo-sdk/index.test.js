const index = require('./index');

// test the functions
( async () => {
    let police_mnemonic = "join seek discover mammal evoke syrup stadium upgrade purse actress tortoise share dinosaur mountain unveil country online lion actress surround debris reject patient absent disagree";
    let user_mnemonic = "skull cruise next service exotic void iron concert true lake hedgehog online educate either acoustic crunch talent cash better weather axis candy genius about candy";

    console.log("\n\nRetriving acounts");
    let u_acc = index.get_account(user_mnemonic);
    let p_acc = index.get_account(police_mnemonic);

    console.log( await index.get_account_info( u_acc.addr ) );
    console.log( await index.get_account_info( p_acc.addr ) );

    console.log("\n\nCreating asset");
    let adsset_id = await index.create_id_asset(p_acc);
    let merchant_asset_id = await index.create_merchant_asset(u_acc);
    
    
    
    console.log("\n\nMaking the Opt in");
    await index.opt_in(u_acc, adsset_id);

    console.log("\n\nTransferring the custom asset");
    // await index.transfer_asset( p_acc, u_acc.addr, "My note for custom asset transfer", 1, adsset_id )
    await index.clawback_asset( p_acc, p_acc.addr, u_acc.addr, "My note for custom asset transfer", 1, adsset_id )

    console.log("\n\nFreezing the address");
    await index.freeze_address( p_acc, u_acc.addr, "Freezed the address", true, adsset_id );
})()