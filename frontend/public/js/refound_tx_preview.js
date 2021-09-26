$(document).ready( e => {
    $('div.preview').click( e => {
        let current_address = $(e.currentTarget).closest("form").find("select").val();
        console.log( current_address )
        if (!current_address) {
            alert("Please select an applicatio before")
        }
        $.ajax({
            type: "POST",
            url: window.location.origin + '/algo/pay_user_vat_preview',
            data: { toAddress: current_address } ,

            success: function(data) {
                console.log("DATA: ", data);
                refound_preview(data);
            },
            error: function(xhr, ajaxOptions, thrownError){
                console.log ( xhr.responseText );
                window.openPopup("ERROR", "error")
            }
        });
    });
    function refound_preview( data ){
        let to_ref = data.to_refound_tx;
        let to_not_ref = data.to_not_refound_tx;
        let table_body = $(".refound-preview-table tbody");
        let substring_cut = 10;
        let VAT_TOKEN_DECIMALS = 2;

        table_body.empty()
        for( let tx of [...to_ref, ...to_not_ref] ){
            let tx_spec = tx['asset-transfer-transaction'];
            
            console.log( tx.id.toString().substring(0, 10) )
            let tr = $(`
                <tr class=" ${tx.refounded ? '' : 'tr-red'} " >
                    <th scope="row">
                        <a href="https://testnet.algoexplorer.io/tx/${tx.id}" >
                        ${tx.id.toString().substring(0, substring_cut)}
                        </a>
                    </th>
                    <td>${tx_spec.sender.toString().substring(0, substring_cut)}</td>
                    <td>${tx_spec.receiver.toString().substring(0, substring_cut)}</td>
                    <td>${tx_spec.amount/(10**VAT_TOKEN_DECIMALS)}</td>
                    <td>${tx.refound/(10**VAT_TOKEN_DECIMALS)}</td>
                </tr>
            `);
            table_body.append(tr);
        }

        let tr = $(`
            <tr class="" >
                <th scope="row"> TOTAL </th>
                <td>--</td>
                <td>--</td>
                <td>Not refounded: ${data.not_refound/(10**VAT_TOKEN_DECIMALS)}</td>
                <td>Refounded: ${data.refound/(10**VAT_TOKEN_DECIMALS)}</td>
            </tr>
        `);
        table_body.append(tr);
    }
}); 