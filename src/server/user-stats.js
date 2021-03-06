/**
 * Created by michbil on 06.12.15.
 */

import WebGold from './ethereum.js'
import {calc_percent,dumpError} from './utils'
import Web3 from 'web3'; var web3 = new Web3();
import {Promise} from 'es6-promise'
import {Router} from 'express';
import {loginWithSessionId,getLoggedInUser} from './wriologin';
import db from './db';
const router = Router();
import WebRunesUsers from './dbmodels/wriouser'
import nconf from './wrio_nconf';
import BigNumber from 'bignumber.js';
import Donations from './dbmodels/donations.js'
import Emissions from './dbmodels/emissions.js'
import EtherFeeds from './dbmodels/etherfeed.js'
import Invoices from "./dbmodels/invoice.js"
//import PrePayment from './dbmodels/prepay.js'
import WrioUser from "./dbmodels/wriouser.js"


var decodeUserNames = async (names) => {
    var nameHash = {};
    var users = await getUserNames(names);
    for (var i in users) {
        var user = users[i];
        nameHash[user.wrioID]=user.lastName;
    }
    return nameHash;
}

var getUserNames = async (names)=> {
    var Users = new WrioUser();
    var query = {
        wrioID : {
            $in: names
        }
    };

    return await Users.getAllUsers(query);

};

router.get('/prepayments', async (request,response) => {
    try {
        var user = await getLoggedInUser(request.sessionID);
        var Users = new WrioUser(db.db);

        // search in User arrays for prepayments designated for us

        var prepQuery = {
            prepayments:
            {
                $elemMatch:
                {
                    to: user.wrioID
                }
            }
        };

        var matchingUsers = await Users.getAllUsers(prepQuery);

        var names = [user.wrioID];
        var prepayments = [];

        if (user.prepayments) { // add user's pening payments to the output list
            prepayments = prepayments.concat(user.prepayments.map((item)=>{
                item.from = user.wrioID;
                item.incoming = false;
                names.push(item.to);
                return item;
            }));
        }

        matchingUsers.map((u) => {
            names.push(u.wrioID);
            var payments = u.prepayments.map((item)=> {
                item.from = u.wrioID; // add from reference
                item.incoming = true;
                return item;
            });
            prepayments = prepayments.concat(payments);
        });

        var nameHash = await decodeUserNames(names);

        response.send(prepayments.map((pre) => {
            console.log(user.wrioID, pre);
            if ((pre.to == user.wrioID) || (pre.from == user.wrioID)) {
                console.log("MATCH");
                return {
                    id: pre.id,
                    incoming: pre.incoming,
                    amount:-pre.amount,
                    timestamp: pre.timestamp,
                    srcName:nameHash[pre.from],
                    destName:nameHash[pre.to]
                };
            }
        }));

    } catch(e) {
        console.log("Error getting prepayments",e);
        dumpError(e);
        response.status(403).send("Error");
    }
});


router.get('/donations', async (request,response) => {
    try {
        var user = await getLoggedInUser(request.sessionID);


        var d = new Donations();
        var query = {
            $or:[
                {srcWrioID: user.wrioID},
                {destWrioID: user.wrioID}
            ]
        };
        var data = await d.getAll(query);
        var names = [];
        data = data.map((item)=> {
            names.push(item.destWrioID);
            names.push(item.srcWrioID);
            if (item.destWrioID === user.wrioID) {
                item.incoming = true;
            } else {
                item.incoming = false;
            }
            return item;
        });
        // create mappings for usernames
        var nameHash = await decodeUserNames(names);
        data = data.map((item)=> {
            item.destName = nameHash[item.destWrioID];
            item.srcName = nameHash[item.srcWrioID];
            return item;
        });
        response.send(data);

    } catch(e) {
        console.log("Error getting donations",e);
        dumpError(e);
        response.status(403).send("Error");
    }
});


export default router;