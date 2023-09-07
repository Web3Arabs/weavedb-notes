import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import WeaveDB from 'weavedb-sdk'
import lf from "localforage"
import { isNil } from "ramda"

export default function Home() {
  // قم بإضافة عنوان العقد الخاص بك هنا
  const contractTxId = "-Zo1F8lx05RaMwcJfZBcTVtF7YvHF8XhFiDlGWnId00"
  // (notes) تخزين اسم المجموعة
  const COLLECTION_NOTES = "notes"
  // تخزين الملاحظات
  const [notes, setNotes] = useState([])
  // weavedb-sdk object تخزين
  const [db, setDb] = useState(null)
  // تخزين بيانات المستخدم في المتغير اثناء اتصاله بالمحفظة
  const [user, setUser] = useState(null)
  // التحقق ما إذا كانت تهيئة قاعدة البيانات قد اكتملت أم لا
  const [initDb, setInitDb] = useState(false)
  // تخزين القيمة التي يدخلها المستخدم في خانة إضافة ملاحظة
  const [text, setText] = useState("");

  // تعمل الدالة على التحقق من المستخدم إن كان متصل او لا
  const checkUser = async () => {
    const wallet_address = await lf.getItem(`temp_address:current`)
    if (!isNil(wallet_address)) {
      const identity = await lf.getItem(
        `temp_address:${contractTxId}:${wallet_address}`
      )
      if (!isNil(identity)) {
        setUser({
          wallet: wallet_address,
          privateKey: identity.privateKey,
        })
      }
    }
  }

  // WeaveDB إعداد قواعد بيانات
  const setupWeaveDB = async () => {
    try {
      const _db = new WeaveDB({
        contractTxId: contractTxId,
      })
      await _db.initializeWithoutWallet()
      setDb(_db)
      setInitDb(true)
    } catch (e) {
      console.error("setupWeaveDB", e)
    }
  }

  // WeaveDB دالة ربط المحفظة والاتصال بقواعد بيانات
  const login = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum, "any")
    const signer = await provider.getSigner()
    await provider.send("eth_requestAccounts", [])
    const wallet_address = await signer.getAddress()
    let identity = await lf.getItem(
      `temp_address:${contractTxId}:${wallet_address}`
    )

    let tx
    let err
    if (isNil(identity)) {
      ;({ tx, identity, err } = await db.createTempAddress(wallet_address))
      const linked = await db.getAddressLink(identity.address)
      if (isNil(linked)) {
        alert("something went wrong")
        return
      }
    } else {
      await lf.setItem("temp_address:current", wallet_address)

      setUser({
        wallet: wallet_address,
        privateKey: identity.privateKey,
      })
      return
    }
    if (!isNil(tx) && isNil(tx.err)) {
      identity.tx = tx
      identity.linked_address = wallet_address
      await lf.setItem("temp_address:current", wallet_address)
      await lf.setItem(
        `temp_address:${contractTxId}:${wallet_address}`,
        JSON.parse(JSON.stringify(identity))
      )
      setUser({
        wallet: wallet_address,
        privateKey: identity.privateKey,
      })
    }
  }

  // تهيئة من اجل تسجيل الدخول اثناء النقر
  const handleLoginClick = async () => {
    try {
      login()
      console.log("<<handleLoginClick()")
    } catch (e) {
      console.error("handleLoginClick", e)
    }
  }

  // دالة تعمل على تسجيل الخروج
  const logout = async () => {
    await lf.removeItem("temp_address:current")
    setUser(null, "temp_current")
    console.log("<<logout()")
  }
  
  // تعمل الدالة على حفظ الملاحظة
  const saveNote = async () => {
    // نقوم بإستدعاء عنوان المحفظة المتصلة
    const wallet_address = await lf.getItem(`temp_address:current`)
    // إدخال البيانات التي نريد إضافتها في قاعدة البيانات
    const _note = { author: wallet_address, text: text }

    try {
      // add إضافة البيانات بإستخدام الدالة
      const res = await db.add(
        _note,
        COLLECTION_NOTES,
        ...(user !== null ? [user] : [])
      )
      getNotes()
      console.log(res)
    } catch (e) {
      console.error(e)
    }
  }

  // تعمل الدالة على إزالة ملاحظة معينة
  const deleteNote = async (id) => {
    try {
      // delete إزالة الملاحظة بإستخدام الدالة
      const res = await db.delete(
        COLLECTION_NOTES,
        id,
        ...(user !== null ? [user] : [])
      )
      getNotes()
      console.log(res)
    } catch (e) {
      console.error(e)
    }
  }

  // إستدعاء الملاحظات من قاعدة البيانات
  const getNotes = async () => {
    try {
      // cget إستدعاء الملاحظات بإستخدام الدالة
      const res = await db.cget(COLLECTION_NOTES)
      setNotes(res)
      console.log("getNotes()", res)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    checkUser()
    setupWeaveDB()
  }, [])

  useEffect(() => {
    if (initDb) {
      getNotes()
    }
  }, [initDb])

  return (
    <div dir="rtl">
      <nav className="relative z-20 bg-white w-full md:static md:text-sm md:border-none">
        <div className="items-center gap-x-14 px-4 max-w-screen-xl mx-auto md:flex md:px-8">
          <div className="flex items-center justify-between py-3 md:py-5 md:block">
            <a href="/"><img src="https://console.weavedb.dev/static/images/logo.png" width={50} height={50} className="-mt-2" alt="notes"/></a>
          </div>
          <div className="nav-menu flex-1 pb-3 mt-8 md:block md:pb-0 md:mt-0">
            <ul className="items-center space-y-6 md:flex md:space-x-6 md:space-x-reverse md:space-y-0">
              <div className='flex-1 items-center justify-end gap-x-6 space-y-3 md:flex md:space-y-0'>
                <li>
                  {/* في حالة المستخدم متصل بالموقع سيقوم بإظهار عنوان الحفظة او زر ربط المحفظة */}
                  {!isNil(user) ? (
                    <button 
                      onClick={logout} 
                      className="block py-3 px-4 font-medium text-center text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:shadow-none rounded-lg shadow md:inline"
                    >
                      {user.wallet.slice(0, 5)}...{user.wallet.slice(-5)}
                    </button>
                  ) : (
                    <button 
                      onClick={handleLoginClick} 
                      className="block py-3 px-4 font-medium text-center text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 active:shadow-none rounded-lg shadow md:inline"
                    >
                      ربط المحفظة
                    </button>
                  )}
                </li>
              </div>
            </ul>
          </div>
        </div>
      </nav>
      <div className="w-full h-screen flex flex-row -mt-8">
        <div className="flex-1 flex flex-col">
          
          <div className="flex flex-col m-10 mt-10">
            <div className="flex lg:w-[95%] flex-col ">
              <label className="text-black text-base">الملاحظة</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="يعد تعلم Web3 الان يشابه شراء البيتكوين عام 2009 والإستثمار بالعديد من العملات المشفرة حتى يومنا هذا."
                className="w-[100%] text-black h-32 placeholder:text-gray-500 rounded-md mt-2 p-2 border border-[#444752] focus:outline-none"
              />
            </div>
          </div>

          <div className="mr-10 -mt-4 flex justify-start">
            <div className="flex items-center ml-8">
              {/* يقوم بتحقق ما إذا قد تم إعداد قاعدة البيانات من اجل السماح للمستخدم بحفظ البيانات دون مشاكل */}
              {
                db ? (
                  <button
                    onClick={saveNote}
                    className="bg-blue-500 hover:bg-blue-700 text-white py-2 px-10 rounded-lg flex justify-center flex-row items-center"
                  ><p>حفظ</p></button>
                ) : <p>جاري إعداد WeaveDB...</p>
              }
            </div>
          </div>

          <div className="flex m-10 mt-10 flex-col">
            <h1 className='font-extrabold font-serif text-2xl text-gray-800'>الملاحظات:</h1>
            <div className='mt-2'>
              {/* إستدعاء الملاحظات وطباعتها */}
              {notes.map((note, idx) => (
                <div key={idx}>
                {/* التحقق من ان مالك الملاحظة هو المتصل بالموقع من اجل عرض الملاحظات الخاصة به فقط */}
                {note.data.author==user?.wallet ? (
                  <div className="flex gap-40 mt-2">
                    <p>● {note.data.text}</p>
                    <button onClick={() => deleteNote(note.id)} className='py-1 px-4 bg-blue-500 hover:bg-blue-700 text-white rounded-lg'>حذف</button>
                  </div>
                ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
