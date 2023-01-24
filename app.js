require('dotenv').config();
const Storage = require('node-storage');
const {log,logColor,colors} = require('./utils/logger');
const client = require('./services/binance');

const MARKET1 = process.argv[2];
const MARKET2 = process.argv[3];
const MARKET = MARKET1 + MARKET2;
const BUY_ORDER_AMOUNT = process.argv[4];

const store = new Storage(`./data/${MARKET}.json`)

const sleep = (timeMs) => new Promise(resolve=> setTimeout(resolve,timeMs));

async function _balances(){
    return await client.balance()
}

function newPriceReset(_market,balance,price){
    const market = _market == 1? MARKET1:MARKET2;
    if(!parseFloat(store.get(`${market.toLocaleLowerCase()}_balance`))>balance){
        store.put('start_price',price);
    }
}

async function _updateBalances(){
    const balances = await _balances();
    store.put(`${MARKET1.toLowerCase()}_balance`,parseFloat(balances[MARKET1].avaliable))
    store.put(`${MARKET2.toLowerCase()}_balance`,parseFloat(balances[MARKET2].avaliable))
}

async function _calculateProfits(){
    const orders = store.get('orders');
    const sold = orders.filter(order =>{
        return order.status == 'sold'
    })
    const totalSoldProfits = sold.length > 0 ? sold.map(order=>order.profit).reduce((prev,next)=>parseFloat(prev) + parseFloat(next)) : 0;

    store.put('profits',totalSoldProfits + parseFloat(store.get('profits')))
}

function _logProfits(price){
    const profits = parseFloat(store.get('profits'))
    var isGainerProfit = profits > 0 ? 1 : profits < 0 ? 2 : 0

    logColor(isGainerProfit == 1 ? colors.green : isGainerProfit == 2 ? colors.red : colors.gray,
        `Global Profits: ${parseFloat(store.get('profits')).toFixed(3)} ${MARKET2}`)

    const m1Balance = parseFloat(store.get(`${MARKET1.toLowerCase()}_balance`))
    const m2Balance = parseFloat(store.get(`${MARKET2.toLowerCase()}_balance`))

    const initialBalance = parseFloat(store.get(`initial_${MARKET2.toLocaleLowerCase()}_balance`));
    logColor(colors.gray,`Balance:${m1Balance} ${MARKET1}, ${m2Balance.toFixed(2)} ${MARKET2}, Current: ${parseFloat(m1Balance * price + m2Balance)} ${MARKET2}, Initial: ${initialBalance.toFixed(2)} ${MARKET2}`)
}


async function _buy(price,amount){
    if(parseFloat(store.get(`${MARKET2.toLowerCase()}_balance`))>= BUY_ORDER_AMOUNT * price){
        var orders = store.get('orders')
        
    }
}

async function broadcast(){
    while(true){
        try{
            const mPrice = parseFloat((await client.prices(MARKET))[MARKET])
            if(mPrice){
                const startPrice = store.get('start_price')
                const marketPrice = mPrice

                console.clear()
                log('==============================')
                _logProfits(marketPrice)
                log('==============================')

                log(`Prev price: ${startPrice}`)
                log(`New price: ${marketPrice}`)

                if(marketPrice > startPrice){
                    const factor = (marketPrice - startPrice)
                    const percent = 100 * factor / marketPrice

                    logColor(colors.green,`Gainers: +${parseFloat(percent).toFixed(3)}% ==> -$${parseFloat(factor).toFixed(4)}`)
                    store.put('percent',`+${parseFloat(percent).toFixed(3)}`)

                     // if(percent >= process.env.PRICE_PERCENT)
                    // await _sell(marketPrice)
                }
                else if(marketPrice < startPrice){
                    var factor = (startPrice- marketPrice);
                    var percent = 100 * factor / startPrice;

                    logColor(colors.red,`Losers: -${parseFloat(percent).toFixed(3)}% ==> -$${parseFloat(factor).toFixed(4)}`)
                    store.put('percent',`-${parseFloat(percent).toFixed(3)}`)

                    // if(percent >= process.env.PRICE_PERCENT)
                    // await _buy(marketPrice,BUY_ORDER_AMOUNT)
                }
                else{
                    logColor(colors.gray,'Change: 0.000% ==> $0.000')
                    store.put('percent','0.000')
                }
            }
        }
        catch(error){

        }
    }
}


async function init(){
    if(process.argv[5] !== 'resume'){
        const price = await client.prices(MARKET)
        store.put('start_price',parseFloat(price[MARKET]))
        store.put('orders',[])
        store.put('profits',0)
        const balances = await _balances()
        store.put(`${MARKET1.toLowerCase()}_balance`,parseFloat(balances[MARKET1].avaliable))
        store.put(`${MARKET2.toLowerCase()}_balance`,parseFloat(balances[MARKET2].avaliable))
    }
}

broadcast()