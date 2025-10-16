'use client'

import { useState, useEffect, useId, useRef, useCallback } from 'react'
import Link from 'next/link'
import moment from 'moment'
import { useParams, useRouter } from 'next/navigation'
import { useWaitForTransactionReceipt, useAccount, useWriteContract } from 'wagmi'
import { initIssueContract, getIssueCount, getIssues } from '@/util/communication'
import { getProfile } from '@/util/api'
import Web3 from 'web3'
import L, { geoJSON } from 'leaflet'
import './../../node_modules/leaflet/dist/leaflet.css'
import { useClientMounted } from '@/hooks/useClientMount'
import { config } from '@/config/wagmi'
import Logo from '@/../public/map3.svg'
import abi from '@/abi/post.json'
import issueAbi from '@/abi/issue.json'
import Profile from '@/app/ui/Profile'
import MarkerIcon from '@/../public/marker-icon.png'
import { MapSearchIcon, BlueCheckMarkIcon, ThreeDotIcon } from '@/components/Icons'
import styles from './page.module.scss'

let map, tileLayer, addressMap, marker
let layerOnMap = []
let shapeLayerGroup

moment.defineLocale('en-short', {
  relativeTime: {
    future: 'in %s',
    past: '%s', //'%s ago'
    s: '1s',
    ss: '%ds',
    m: '1m',
    mm: '%dm',
    h: '1h',
    hh: '%dh',
    d: '1d',
    dd: '%dd',
    M: '1mo',
    MM: '%dmo',
    y: '1y',
    yy: '%dy',
  },
})

export default function Page() {
  const [isMapInitialized, setIsMapInitialized] = useState(false)
  const [issueModal, setIssueModal] = useState(false)
  const { web3, contract } = initIssueContract()
  const giftModal = useRef()
  const giftModalMessage = useRef()
  const [activeTab, setActiveTab] = useState('issues')
  const mounted = useClientMounted()
  const params = useParams()
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const openModal = (e, item) => {
    e.target.innerText = `Sending...`
    setSelectedEmoji({ e: e.target, item: item, message: null })
    giftModal.current.showModal()
  }

  const removeMarkerLayer = () => {
    for (var i = 0; i < mapMarkers.length; i++) map.removeLayer(mapMarkers[i].marker)
    document.querySelectorAll('input[type="checkbox"]').forEach((item) => {
      item.checked = false
    })
    setMapPoints([])
    mapMarkers = []
  }

  function getRandomColor() {
    var letters = '0123456789ABCDEF'
    var color = '#'
    for (var i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)]
    }
    return color
  }

  /**
   * Show markers on the map
   * @param {void} points
   */
  const showPoints = (points, categoryId) => {
    // Clean map from markers
    //removeMarkerLayer()
    console.log(points)

    // Recognize the point type(marker || geoJSON)

    points.forEach((item, i) => {
      if (item.type === 'geoJSON') {
        const geoJSONobj = JSON.parse(item.point_description)

        let customGeoJSON = L.geoJSON(geoJSONobj, {
          style: function (feature) {
            return {
              color: feature.properties.color || `${getRandomColor()}`,
              fillColor: 'rgba(14, 54, 100, .9)',
              fillOpacity: 0.8,
            }
          },
        })
          .bindPopup(function (layer) {
            return layer.feature.properties.description || ''
          })
          .addTo(map)

        mapMarkers.push({ categoryId: categoryId, marker: customGeoJSON })
        return
      }

      // Else

      let myIcon = L.icon({
        iconUrl: `${process.env.REACT_APP_UPLOAD}images/${item.marker}`,
        iconSize: [25, 41],
        iconAnchor: [25, 41],
        popupAnchor: [-15, -41],
      })
      let marker = L.marker(JSON.parse(item.area), { icon: myIcon })
      marker.bindPopup(`<table title='${item.point_id}' style='font-family:vazir;font-size:18px;text-align:right;padding:.5rem'>
<tbody>
<tr>
<td>نام: ${item.title}<td>
</tr>
<tr>
 ${item.phone !== null ? `<td>تلفن: <span dir='ltr'>${item.phone}</span><td>` : ''}
</tr>
<tr>
<td>
<a style="font-family:vazir" target='_blank' href='https://www.google.com/maps/dir//${JSON.parse(item.area)[0]},${JSON.parse(item.area)[1]}/@${JSON.parse(item.area)[0]},48.3079047,14z'>
Direction
</a>
</td>
</tr>
</tbody></table>`)
      //${(item.gallery) ? <img src={`${process.env.REACT_APP_UPLOAD}images/${JSON.parse(item.gallery)[0]}`} style='height:120px' /> : ''}
      marker.addTo(map)
      mapMarkers.push({ categoryId: categoryId, marker: marker })
    })
  }

  const allLayers = async (e, categoryId = false) => {
    setIsLoading(true)

    if (e.target.checked && mapPoints.includes(categoryId) === false) {
      // Get the points
      let requestOptions = {
        method: 'GET',
        redirect: 'follow',
      }
      await fetch(`${process.env.REACT_APP_BASE_URL}point/${categoryId ? categoryId : ''}`, requestOptions)
        .then((response) => response.json())
        .then((result) => {
          console.log(result)
          setIsLoading(false)
          showPoints(result, categoryId)
          setMapPoints([...mapPoints, categoryId])
          console.log(mapPoints)
        })
        .catch((error) => console.log('error', error))
    } else {
      // remove the markers because checkbox is false
      for (var i = 0; i < mapMarkers.length; i++) {
        if (mapMarkers[i].categoryId === categoryId) map.removeLayer(mapMarkers[i].marker)
      }
      setMapPoints(mapPoints.filter((item) => item !== categoryId))
      setIsLoading(false)
    }

    //-------------------------------------

    var popup = L.popup()
    // function onMapClick(e) {
    //     console.log(e.latlng.toString())
    //     popup
    //         .setLatLng(e.latlng)
    //         .setContent("این نقشه توسط سازمان فناوری اطلاعات و ارتباطات شهرداری گسترش داده شده است و در حال  تکمیل می باشد")
    //         .openOn(map);
    // }
    // map.on('click', onMapClick);

    function onLocationError(e) {
      alert(e.message)
    }

    map.on('locationerror', onLocationError)
  }

  const detectUsrLocation = () => {
    let currentLocationIcon = L.icon({
      iconUrl: `${process.env.REACT_APP_UPLOAD}images/current-location.png`,
      iconSize: [25, 25],
      iconAnchor: [25, 25],
      popupAnchor: [-15, -25],
    })

    if (window.navigator.geolocation) {
      window.navigator.geolocation.getCurrentPosition((result) => {
        console.log(result.coords)
        let marker = L.marker([result.coords.latitude, result.coords.longitude], { icon: currentLocationIcon })
        marker.bindPopup(`
                <center>
                <h1>موقعیت شما</h1>
                </center>
                `)
        marker.addTo(map)

        map.setView([result.coords.latitude, result.coords.longitude], 12)
      }, console.log)
    }
  }

  const mapInit = () => {
    setIsMapInitialized(true)

    // let mapMarkers = []
    // let showLayer = []

    let southWest = L.latLng(38.1798206357761, 48.21865389083308),
      northEast = L.latLng(38.30520008275403, 48.345629549549045),
      bounds = L.latLngBounds(southWest, northEast)

    map = L.map('map', {
      zoomDelta: 1.25,
      zoomSnap: 1,
      // maxBounds: bounds,
      maxZoom: 18,
      minZoom: 1,
    })

    map.setView([-40.150168234083736, -71.31541448757797], 12)

    let osm = L.tileLayer(`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, {
      maxZoom: 18,
      attribution: '',
    }).addTo(map)

    // var states = [{
    //     "type": "Feature",
    //     "properties": {"party": "Republican"},
    //     "geometry": {
    //         "type": "Polygon",
    //         "coordinates": [[
    //             [-104.05, 48.99],
    //             [-97.22,  48.98],
    //             [-96.58,  45.94],
    //             [-104.03, 45.94],
    //             [-104.05, 48.99]
    //         ]]
    //     }
    // }, {
    //     "type": "Feature",
    //     "properties": {"party": "Democrat"},
    //     "geometry": {
    //         "type": "Polygon",
    //         "coordinates": [[
    //             [-109.05, 41.00],
    //             [-102.06, 40.99],
    //             [-102.03, 36.99],
    //             [-109.04, 36.99],
    //             [-109.05, 41.00]
    //         ]]
    //     }
    // }];

    // L.geoJSON(states, {
    //     style: function(feature) {
    //         switch (feature.properties.party) {
    //             case 'Republican': return {color: "#ff0000"};
    //             case 'Democrat':   return {color: "#0000ff"};
    //         }
    //     }
    // }).addTo(map);

    // watermark
    L.Control.Watermark = L.Control.extend({
      onAdd: (map) => {
        var img = L.DomUtil.create('img')
        img.src = Logo.src
        img.style.width = '40px'
        return img
      },
      onRemove: function (map) {
        // Nothing to do here
      },
    })

    L.control.watermark = function (opts) {
      return new L.Control.Watermark(opts)
    }

    L.control.watermark({ position: 'bottomleft' }).addTo(map)

    // let circle = L.circle([38.24022, 48.28991], {
    //     color: '#0036B6',
    //     fillColor: 'rgba(0, 0, 0, .1)',
    //     fillOpacity: 0.5,
    //     radius: 6000
    // })

    // circle.addTo(map);

    L.geoJSON(
      {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [48.28220576047898, 38.28076775881339],
                  [48.281961679458625, 38.28004557141724],
                  [48.282487392425544, 38.27919915022319],
                  [48.28177928924561, 38.277935816653],
                  [48.28190803527832, 38.27677353035388],
                  [48.28242301940918, 38.27560280288215],
                  [48.28360319137574, 38.276630348870455],
                  [48.28490138053895, 38.2769588236192],
                  [48.28629612922669, 38.27780105977475],
                  [48.2874870300293, 38.27817164058812],
                  [48.28762650489808, 38.27844115271894],
                  [48.28761577606202, 38.27891279654057],
                  [48.28742265701295, 38.279274949538355],
                  [48.28727245330811, 38.27994871775075],
                  [48.28735828399659, 38.28111937514933],
                  [48.28750848770142, 38.282315279042734],
                  [48.28816294670105, 38.28313218798287],
                  [48.2900083065033, 38.28466492015765],
                  [48.289954662323005, 38.28540600982185],
                  [48.289707899093635, 38.28597024347017],
                  [48.2896649837494, 38.286568157922865],
                  [48.28985810279847, 38.287646075760115],
                  [48.289192914962776, 38.28777239320875],
                  [48.28829169273377, 38.286963957738564],
                  [48.28784108161926, 38.28634920390613],
                  [48.28702569007874, 38.2863407825846],
                  [48.28737974166871, 38.28680395381765],
                  [48.28760504722596, 38.28691343022268],
                  [48.2888925075531, 38.28775555089496],
                  [48.28888177871704, 38.28794081613166],
                  [48.28840970993043, 38.288572398611755],
                  [48.28840970993043, 38.28919555460557],
                  [48.28951478004456, 38.28981870524895],
                  [48.28908562660218, 38.29064395056885],
                  [48.289675712585456, 38.29154497300812],
                  [48.28911781311036, 38.29168812507609],
                  [48.288549184799194, 38.29236177807543],
                  [48.28832387924195, 38.29418060993772],
                  [48.290673494338996, 38.294323756806556],
                  [48.291424512863166, 38.29452584602296],
                  [48.29249739646912, 38.29440796071512],
                  [48.29330205917359, 38.29494686341614],
                  [48.29450368881226, 38.294534266394734],
                  [48.294954299926765, 38.29408798534272],
                  [48.29496502876282, 38.292875434285406],
                  [48.29438567161561, 38.29191548366247],
                  [48.29351663589478, 38.291326034005024],
                  [48.294278383255005, 38.29140182065777],
                  [48.29614520072938, 38.292008111030505],
                  [48.29641342163087, 38.29135971697154],
                  [48.29708933830261, 38.291317613260944],
                  [48.29703569412232, 38.291090252801446],
                  [48.29744338989258, 38.29091341639609],
                  [48.29675674438477, 38.28940607907004],
                  [48.29735755920411, 38.28906081862784],
                  [48.29728245735169, 38.28833660846209],
                  [48.29840898513795, 38.28786502586472],
                  [48.299535512924194, 38.28773870857728],
                  [48.29977154731751, 38.28805871194517],
                  [48.299964666366584, 38.287923973856955],
                  [48.29926729202271, 38.28714080376708],
                  [48.29955697059632, 38.28664394954401],
                  [48.298205137252815, 38.286896587709585],
                  [48.29758286476135, 38.28673658364016],
                  [48.29738974571229, 38.28607129977987],
                  [48.29561948776246, 38.284572283417624],
                  [48.29437494277955, 38.282071046749834],
                  [48.29527616500855, 38.28042035177901],
                  [48.29682111740113, 38.28042035177901],
                  [48.29740047454835, 38.280891982743405],
                  [48.298430442810066, 38.281077265498276],
                  [48.30027580261231, 38.28141414202294],
                  [48.30154180526734, 38.282138421257535],
                  [48.30224990844727, 38.28138045444083],
                  [48.302507400512695, 38.28030244355917],
                  [48.314523696899414, 38.27248638596234],
                  [48.31825733184815, 38.27273907339769],
                  [48.325703144073486, 38.27049854747348],
                  [48.32147598266602, 38.26303524452957],
                  [48.318150043487556, 38.2603226577589],
                  [48.31591844558716, 38.25875571366085],
                  [48.31784963607788, 38.25484663054233],
                  [48.318922519683845, 38.25514992899925],
                  [48.31937313079835, 38.25580707131302],
                  [48.319437503814704, 38.257357229636604],
                  [48.32003831863404, 38.25882310980141],
                  [48.3204460144043, 38.259951985862585],
                  [48.32181930541993, 38.26113138987741],
                  [48.32340717315674, 38.26141781367723],
                  [48.326175212860115, 38.26119878381426],
                  [48.32754850387574, 38.260491144359314],
                  [48.32780599594116, 38.258637770264386],
                  [48.32758069038392, 38.255933444153584],
                  [48.32636833190918, 38.251459711779695],
                  [48.325445652008064, 38.248300130333085],
                  [48.32351982593537, 38.24621051834791],
                  [48.32692623138428, 38.24613468452531],
                  [48.32459270954133, 38.24357314004956],
                  [48.32509696483613, 38.242928526649],
                  [48.32473754882813, 38.242637816774696],
                  [48.3239758014679, 38.24304228237031],
                  [48.32295656204224, 38.24193842303913],
                  [48.32348227500916, 38.24155080433606],
                  [48.32305312156677, 38.24128958187049],
                  [48.322645425796516, 38.24158451039228],
                  [48.32174420356751, 38.24061545504224],
                  [48.323922157287605, 38.23978964115908],
                  [48.32422256469727, 38.239991882161014],
                  [48.323889970779426, 38.24077556072993],
                  [48.325005769729614, 38.241180036686245],
                  [48.325434923172004, 38.240792413939715],
                  [48.32600355148316, 38.24118846324474],
                  [48.32883596420288, 38.24091038629872],
                  [48.33181858062744, 38.23892168380455],
                  [48.333406448364265, 38.23635988517329],
                  [48.33111047744751, 38.232146204278706],
                  [48.332483768463135, 38.230528085936875],
                  [48.332870006561286, 38.22943246453615],
                  [48.33426475524902, 38.22638149336184],
                  [48.329200744628906, 38.21512044789826],
                  [48.324909210205085, 38.21080437569769],
                  [48.32387924194337, 38.20432978746499],
                  [48.30538272857667, 38.19599965251109],
                  [48.298280239105225, 38.19277863635641],
                  [48.29156398773194, 38.189844183496106],
                  [48.285555839538574, 38.189439422099035],
                  [48.28130722045899, 38.18922017540312],
                  [48.27677965164185, 38.188916601965445],
                  [48.27032089233399, 38.19191855035254],
                  [48.26094388961792, 38.196792236738766],
                  [48.25276851654053, 38.19605024325146],
                  [48.249807357788086, 38.19851228347163],
                  [48.248562812805176, 38.20107541497928],
                  [48.2504940032959, 38.2036384562566],
                  [48.25362682342529, 38.2066566589048],
                  [48.25040817260743, 38.210028804344745],
                  [48.2466208934784, 38.20894551965456],
                  [48.246014714241035, 38.20928694575215],
                  [48.2458108663559, 38.21464417515193],
                  [48.244249820709236, 38.220768046352056],
                  [48.24412107467652, 38.22462839126061],
                  [48.244249820709236, 38.22928076181062],
                  [48.243777751922615, 38.233578883177074],
                  [48.24321985244752, 38.23812955834102],
                  [48.247489929199226, 38.24613468452531],
                  [48.24714660644532, 38.255571174755936],
                  [48.25332641601563, 38.258941052897],
                  [48.254528045654304, 38.25907584477181],
                  [48.256072998046875, 38.257458325769825],
                  [48.25916290283204, 38.25961500977032],
                  [48.258476257324226, 38.26298470036054],
                  [48.251481056213386, 38.27689986672244],
                  [48.255987167358406, 38.28400803890272],
                  [48.25663089752198, 38.2873429129864],
                  [48.25761795043946, 38.28808397530884],
                  [48.25886249542236, 38.287241858447096],
                  [48.261523246765144, 38.28892608239997],
                  [48.26066493988038, 38.29168812507609],
                  [48.26465606689454, 38.29215968283224],
                  [48.264999389648445, 38.291149198174175],
                  [48.26937675476075, 38.28966712855786],
                  [48.270449638366706, 38.288151344235686],
                  [48.27062129974366, 38.2834353683433],
                  [48.27014923095704, 38.281818391789095],
                  [48.27598571777344, 38.28063932367922],
                  [48.279110491275794, 38.28112148063126],
                  [48.28005731105805, 38.28125833682458],
                  [48.28244715929032, 38.28151941561632],
                  [48.28220576047898, 38.28076775881339],
                ],
              ],
            },
            id: '02bd6ce2-24c9-432b-aa7b-d5858c7ff41d',
            properties: {
              name: '',
              color: '#0036B6',
              description: 'شهرستان اردبیل',
            },
          },
        ],
      },
      {
        style: function (feature) {
          return {
            color: feature.properties.color,
            fillColor: 'rgba(14, 54, 100, .2)',
            fillOpacity: 0.5,
          }
        },
      }
    )
      .bindPopup(function (layer) {
        return layer.feature.properties.description || ''
      })
      .addTo(map)
  }

  useEffect(() => {
    const mapContainer = document.getElementById('map')

    // Leaflet has a method to check if a container has a map
    if (mapContainer && !mapContainer._leaflet_id) {
      mapInit()
    }

    /**
     * 
     *getPollByIndex(params.id).then((res) => {
      console.log(res)
      res.pollId = params.id
      setPolls({ list: res })
    })
     */
  }, []) // Added necessary dependencies  [isLoadedPoll, postsLoaded]

  return (
    <div className={`${styles.page} ms-motion-slideDownIn`}>
      {issueModal && <IssueModal setIssueModal={setIssueModal} />}

      <aside className={`${styles.aside} flex flex-column`}>
        <ul className={`${styles.tab} flex flex-row align-items-center justify-content-center w-100`}>
          <li>
            <button className={activeTab === 'chat' ? styles.activeTab : ''} onClick={() => setActiveTab('chat')}>
              Chat
            </button>
          </li>
          <li>
            <button className={activeTab === 'issues' ? styles.activeTab : ''} onClick={() => setActiveTab('issues')}>
              Issues
            </button>
          </li>
          <li>
            <button className={activeTab === 'events' ? styles.activeTab : ''} onClick={() => setActiveTab('events')}>
              Events
            </button>
          </li>
          <li>
            <button className={activeTab === 'proposals' ? styles.activeTab : ''} onClick={() => setActiveTab('proposals')}>
              Proposals
            </button>
          </li>
        </ul>

        {activeTab === 'chat' && (
          <div className={`${styles.tabContent} ${styles.chat} relative d-f-c`}>
            <iframe src="//hup.social" frameBorder="0" />
          </div>
        )}

        {activeTab === 'issues' && (
          <div className={`${styles.tabContent} ${styles.issue} relative d-f-c flex-column gap-1`}>
            <Issues />
          </div>
        )}

        {activeTab === 'events' && (
          <div className={`${styles.tabContent} ${styles.issue} relative`}>
            <Issues />
          </div>
        )}

        {activeTab === 'proposals' && (
          <div className={`${styles.tabContent} ${styles.proposal} relative`}>
            <Issues />
          </div>
        )}
      </aside>

      <div id={`map`} className={`${styles.map}`} />
    </div>
  )
}
/**
 * No data in tab content
 * @param {*} param0
 * @returns
 */
const NoData = ({ name }) => {
  return (
    <div>
      <p>No {name} yet.</p>
    </div>
  )
}

const Nav = ({ item }) => {
  const [showPostDropdown, setShowPostDropdown] = useState()

  return (
    <div className={`relative`}>
      <button
        className={`${styles.btnPostMenu} rounded`}
        onClick={(e) => {
          e.stopPropagation()
          setShowPostDropdown(!showPostDropdown)
        }}
      >
        <ThreeDotIcon />
      </button>

      {showPostDropdown && (
        <div className={`${styles.postDropdown} animate fade flex flex-column align-items-center justify-content-start gap-050`}>
          <ul>
            <li>
              <Link href={`p/${item.postId}`}>View post</Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

const IssueModal = ({ setIssueModal }) => {
  const [hasLiked, setHasLiked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMounted = useClientMounted()
  const [commentContent, setCommentContent] = useState('')
  const { address, isConnected } = useAccount()
  const { web3, contract } = initIssueContract()
  const { data: hash, isPending: isSigning, error: submitError, writeContract } = useWriteContract()
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
  })

  const getHasLiked = async () => {
    return isConnected ? await getHasLikedPost(id, address) : false
  }

  const unlikePost = (e, id) => {
    e.stopPropagation()

    if (!isConnected) {
      console.log(`Please connect your wallet first`, 'error')
      return
    }

    writeContract({
      abi,
      address: process.env.NEXT_PUBLIC_CONTRACT_POST,
      functionName: 'unlikePost',
      args: [id],
    })
  }

  const createIssue = (e) => {
    e.preventDefault()

    if (!isConnected) {
      console.log(`Please connect your wallet first`, 'error')
      return
    }

    const formData = new FormData(e.target)
    const metadata = ''
    const title = formData.get('title')
    const category = formData.get('category')
    const coordination = formData.get('coordination')
    const address1 = formData.get('address1')
    const content = formData.get('content')
    const amount = formData.get('amount')

    const errors = {}

    //    const web3 = new Web3(window.lukso)

    // // // Create a Contract instance
    // const contract = new web3.eth.Contract(issueAbi, process.env.NEXT_PUBLIC_CONTRACT_ISSUE)

    //   window.lukso.request({ method: 'eth_requestAccounts' }).then((accounts) => {
    //     contract.methods
    //       .createIssue(metadata, "title", "category", "coordination", "address1", "content", 100)
    //       .send({
    //         from: accounts[0],
    //         value: 0
    //       })
    //       .then((res) => {
    //         console.log(res)
    //         toast(`Done`)
    //       })
    //       .catch((error) => {
    //         console.log(error)
    //         toast.dismiss(t)
    //       })
    //   })
    //   //-------------------------------

    console.log(content)

    writeContract({
      abi: issueAbi,
      address: process.env.NEXT_PUBLIC_CONTRACT_ISSUE,
      functionName: 'createIssue',
      args: [metadata, title, category, coordination, address1, content, 100],
    })
  }

  const addressMapInit = () => {
    let cloudmadeUrl = 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
      cloudmade = new L.TileLayer(cloudmadeUrl, { maxZoom: 19 })

    let southWest = L.latLng(38.1798206357761, 48.21865389083308),
      northEast = L.latLng(38.30520008275403, 48.345629549549045),
      bounds = L.latLngBounds(southWest, northEast)

    addressMap = new L.Map('addressMap', {
      zoomSnap: 0.5,
      // maxBounds: bounds,
      fullscreenControl: true,
      layers: [cloudmade],
      center: new L.LatLng(-40.150168234083736, -71.31541448757797),
      zoom: 14,
    })

    let MyCustomMarker = L.Icon.extend({
      options: {
        shadowUrl: null,
        iconAnchor: new L.Point(12, 12),
        iconSize: new L.Point(25, 41),
        iconUrl: MarkerIcon.src,
      },
    })

    var greenIcon = L.icon({
      shadowUrl: null,
      iconAnchor: new L.Point(12, 12),
      iconSize: new L.Point(25, 41),
      iconUrl: MarkerIcon.src,
    })

    let marker = new L.marker([-40.150168234083736, -71.31541448757797], {
      draggable: true,
      autoPan: true,
      icon: greenIcon,
    }).addTo(addressMap)

    addressMap.on('drag', (event) => {
      // console.log(addressMap.getCenter())
      marker.setLatLng(addressMap.getCenter())
      document.querySelector('#address_location').value = `${marker.getLatLng().lat}, ${marker.getLatLng().lng}`
      document.querySelector('#addressMap span').innerText = `${marker.getLatLng().lat}, ${marker.getLatLng().lng}`
    })

    marker.on('dragend', (event) => {
      console.log(marker.getLatLng())
      document.querySelector(`[name='coordination']`).value = `${marker.getLatLng().lat}, ${marker.getLatLng().lng}`
      //document.querySelector('#addressMap span').innerText = `${marker.getLatLng().lat}, ${marker.getLatLng().lng}`

      var requestOptions = {
        method: 'GET',
        redirect: 'follow',
      }

      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${marker.getLatLng().lat}&lon=${marker.getLatLng().lng}&format=jsonv2&accept-language=fa`, requestOptions)
        .then((response) => response.json())
        .then((result) => {
          console.log(result)
          document.querySelector(`[name='address1']`).value = `${result.display_name}`
        })
        .catch((error) => console.log('error', error))
    })

    tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      apikey: '<your apikey>',
      attribution: '',
      subdomains: 'abcd',
      minZoom: 0,
      maxZoom: 20,
      ext: 'png',
    }).addTo(addressMap)

    // Add a fresh layer, to group the shapes
    shapeLayerGroup = L.layerGroup().addTo(addressMap)

    var editableLayers = new L.FeatureGroup()
    addressMap.addLayer(editableLayers)

    var options = {
      position: 'topright',
      draw: {
        polyline: {
          shapeOptions: {
            color: '#f357a1',
            weight: 10,
          },
        },
        polygon: {
          allowIntersection: false, // Restricts shapes to simple polygons
          drawError: {
            color: '#e1e100', // Color the shape will turn when intersects
            message: "<strong>Oh snap!<strong> you can't draw that!", // Message that will show when intersect
          },
          shapeOptions: {
            color: '#FF5A47',
          },
        },
        circlemarker: false,
        rectangle: false,
        marker: {
          icon: new MyCustomMarker(),
        },
      },
      edit: {
        featureGroup: editableLayers, //REQUIRED!!
        remove: false,
      },
    }
  }

  useEffect(() => {
    const mapContainer = document.getElementById('addressMap')

    // Leaflet has a method to check if a container has a map
    if (mapContainer && !mapContainer._leaflet_id) {
      addressMapInit()
    }

    // getHasLiked()
    //   .then((result) => {
    //     setHasLiked(result)
    //     setLoading(false)
    //   })
    //   .catch((err) => {
    //     console.log(err)
    //     setError(`⚠️`)
    //     setLoading(false)
    //   })
  }, [])

  // if (loading) {
  //   return <InlineLoading />
  // }

  if (error) {
    return <span>{error}</span>
  }

  return (
    <div className={`${styles.issueModal} animate fade`} onClick={() => setIssueModal()}>
      <div className={`${styles.issueModal__container}`} onClick={(e) => e.stopPropagation()}>
        <header className={`${styles.issueModal__container__header}`}>
          <div className={``} aria-label="Close" onClick={() => setIssueModal()}>
            Cancel
          </div>
          <div className={`flex-1`}>
            <h3>Create issue</h3>
          </div>
          <div></div>
        </header>

        <main className={`${styles.issueModal__container__main}`}>
          <article className={`${styles.issueModal__post}`}>
            <section className={`flex flex-column align-items-start justify-content-between`}>
              <header className={`${styles.issueModal__post__header}`}>{/* <Profile creator={item.creator} createdAt={item.createdAt} /> */}</header>
              <main className={`${styles.issueModal__post__main} w-100 flex flex-column grid--gap-050`}>
                <form className={`form`} onSubmit={(e) => createIssue(e)}>
                  <div className={`form-group`}>
                    <label htmlFor="">Title</label>
                    <input className={`form-input`} type="text" name="title" id="" placeholder={`Title`} />
                  </div>
                  <div className={`form-group`}>
                    <label htmlFor="">Description</label>
                    <textarea className={`form-input`} name="content" id="" placeholder={`Description`}></textarea>
                  </div>
                  <div className={`form-group`}>
                    <label htmlFor="">Category</label>
                    <select name="category" id="">
                      <option value="">Infrastructure</option>
                      <option value="">Vandalism</option>
                      <option value="">Waste management</option>
                      <option value="">Crime</option>
                    </select>
                  </div>
                  <div className={`form-group`}>
                    <label htmlFor="">Coordination</label>
                    <input className={`form-input`} type="text" name="coordination" id="" placeholder={`x,y`} />
                    <details>
                      <summary>Open Map</summary>
                      <div id="addressMap" className={styles.addressMap}>
                        <span className={styles.latlong} />
                      </div>
                      <input type="hidden" value="" id="address_location" name="address_location" />
                    </details>
                  </div>
                  <div className={`form-group`}>
                    <label htmlFor="">Address</label>
                    <input className={`form-input`} type="text" name="address1" id="" placeholder={`Street`} />
                  </div>
                  <div className={`form-group`}>
                    <fieldset className="flex flex-column" style={{ padding: `.4rem` }}>
                      <legend>What should happen next?</legend>

                      <div className={`flex gap-025`}>
                        <input type="radio" name="type" id="report" />
                        <label htmlFor="report">Just report it</label>
                      </div>

                      <div className={`flex gap-025`}>
                        <input type="radio" name="type" id="funding" />
                        <label htmlFor="funding">Request community funding</label>
                      </div>

                      <div className={`flex gap-025`}>
                        <input type="radio" name="type" id="volunteer" />
                        <label htmlFor="volunteer">Find volunteers</label>
                      </div>
                    </fieldset>
                  </div>
                  <div className={`form-group`}>
                    <label htmlFor="">Amount</label>
                    <input className={`form-input`} type="text" name="amount" id="" placeholder={`Amount`} defaultValue={0} />
                  </div>
                  <button type="submit" className="btn">
                    Create
                  </button>
                </form>
              </main>
            </section>
          </article>
        </main>
      </div>
    </div>
  )
}

/**
 * Issues
 * @param {*} param0
 * @returns
 */
const Issues = () => {
  const [posts, setPosts] = useState({ list: [] })
  const [postsLoaded, setPostsLoaded] = useState(0)
  const [isLoadedPoll, setIsLoadedPoll] = useState(false)
  const [isMapInitialized, setIsMapInitialized] = useState(false)
  const [reactionCounter, setReactionCounter] = useState(0)
  const [postCount, setPostCount] = useState()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isMounted = useClientMounted()
  const { address, isConnected } = useAccount()
  const { data: hash, isPending, writeContract } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  })

  const getHasLiked = async () => {
    return isConnected ? await getHasLikedPost(Web3.utils.toNumber(id), address) : false
  }

  const likePost = (e, id) => {
    e.stopPropagation()

    if (!isConnected) {
      console.log(`Please connect your wallet first`, 'error')
      return
    }

    writeContract({
      abi,
      address: process.env.NEXT_PUBLIC_CONTRACT_POST,
      functionName: 'likePost',
      args: [id],
    })
  }

  const unlikePost = (e, id) => {
    e.stopPropagation()

    if (!isConnected) {
      console.log(`Please connect your wallet first`, 'error')
      return
    }

    writeContract({
      abi,
      address: process.env.NEXT_PUBLIC_CONTRACT_POST,
      functionName: 'unlikePost',
      args: [id],
    })
  }
  const loadMorePosts = async (totalPoll) => {
    // 1. **Add a guard clause to prevent re-entry**
    if (isLoadedPoll) return

    // 2. Set to true *before* starting the async operation
    setIsLoadedPoll(true)

    try {
      let postsPerPage = 20
      let startIndex = totalPoll - postsLoaded - postsPerPage

      // **Stop loading if all posts are accounted for**
      if (postsLoaded >= totalPoll) {
        console.log('All polls loaded.')
        // We can return here, but still need to handle setIsLoadedPoll(false)
      }

      if (startIndex < 0) {
        // Check if we are trying to load past the first post
        postsPerPage = totalPoll - postsLoaded
        startIndex = 0
        if (postsPerPage <= 0) {
          // All loaded
          console.log('All polls loaded.')
          return // Exit early
        }
      }

      // ... (rest of your logic for calculating startIndex/postsPerPage) ...

      // 3. Fetch the next batch of polls
      console.log(startIndex + 1, postsPerPage)
      const newPosts = await getIssues(startIndex + 1, postsPerPage)
      console.log(`newPosts => `, newPosts)
      newPosts.reverse()

      if (Array.isArray(newPosts) && newPosts.length > 0) {
        setPosts((prevPolls) => ({ list: [...prevPolls.list, ...newPosts] }))
        setPostsLoaded((prevLoaded) => prevLoaded + newPosts.length)
      }
    } catch (error) {
      console.error('Error loading more polls:', error)
    } finally {
      // 4. **Crucial: Set to false in finally block**
      // This re-enables loading for the next scroll event.
      setIsLoadedPoll(false)
    }
  }

  const showIssue = (item) => {
    // Clean map from markers
    //removeMarkerLayer()
    // Recognize the point type(marker || geoJSON)
    // Else

    let myIcon = L.icon({
      iconUrl: `${MarkerIcon.src}`,
      iconSize: [25, 41],
      iconAnchor: [25, 41],
      popupAnchor: [-15, -41],
    })

    let marker = L.marker(item.coordination.split(','), { icon: myIcon })

    marker.bindPopup(`<table  style='width:200px;font-size:18px;padding:.5rem'>
    <tbody>
    <tr>
    <td>${item.title}<td>
    </tr>
    <tr>
    <td>
    <a style="font-family:vazir" target='_blank' href='https://www.google.com/maps/dir/@${item.coordination}/,48.3079047,14z'>
    Direction
    </a>
    </td>
    </tr>
    </tbody></table>`)

    marker.addTo(map)
    // mapMarkers.push({ categoryId: categoryId, marker: marker })
  }

  useEffect(() => {
    console.log(map)

    getIssueCount().then((count) => {
      setPostCount(Number(count))

      if (postsLoaded === 0 && !isLoadedPoll) {
        loadMorePosts(Number(count))
      }
    })
  }, [])

  // if (loading) {
  //   return <InlineLoading />
  // }

  if (error) {
    return <span>{error}</span>
  }

  return (
    <div className={`${styles.grid} flex flex-column w-100`}>
      {posts &&
        posts.list.length > 0 &&
        posts.list.map((item, i) => {
          return (
            <article key={i} className={`${styles.post} animate fade`}>
              {/* onClick={() => router.push(`p/${item.postId}`)} */}
              <section data-name={item.name} className={`flex flex-column align-items-start justify-content-between`}>
                <header className={`${styles.post__header} flex align-items-start justify-content-between`}>
                  {<Profile creator={item.creator} createdAt={item.createdAt} />}
                  <Nav item={item} />
                </header>
                <main className={`${styles.post__main} w-100 flex flex-column grid--gap-050`}>
                  <h3>{item.title}</h3>
                  <div className={`${styles.post__content} `}>{item.content}</div>

                  <div onClick={(e) => showIssue(item)} className={`${styles.post__actions} flex flex-row align-items-center justify-content-start`}>
                    <button title={item.coordination}>
                      <MapSearchIcon />
                    </button>
                  </div>
                </main>
              </section>
              {i < posts.list.length - 1 && <hr />}
            </article>
          )
        })}

      {!posts && (
        <>
          <NoData name={`issue`} />
        </>
      )}

      <button className="btn" onClick={() => setIssueModal(true)}>
        Create issue
      </button>
    </div>
  )
}

/**
 * Profile
 * @param {String} addr
 * @returns
 */
const ConnectedProfile = ({ addr, chainId = 4201 }) => {
  const [profile, setProfile] = useState()
  const [chain, setChain] = useState()
  const defaultUsername = `hup-user`

  useEffect(() => {
    getProfile(addr).then((res) => {
      if (res.data && Array.isArray(res.data.Profile) && res.data.Profile.length > 0) {
        setProfile(res)
      } else {
        setProfile({
          data: {
            Profile: [
              {
                fullName: 'annonymous',
                name: 'annonymous',
                tags: ['profile'],
                profileImages: [
                  {
                    isSVG: true,
                    src: `${toSvg(`${creator}`, 36)}`,
                    url: 'ipfs://',
                  },
                ],
              },
            ],
          },
        })
      }
    })

    setChain(config.chains.filter((filterItem) => filterItem.id === chainId)[0])
  }, [])

  if (!profile)
    return (
      <div className={`${styles.profileShimmer} flex align-items-center gap-050`}>
        <div className={`shimmer rounded`} style={{ width: `36px`, height: `36px` }} />
        <div className={`flex flex-column justify-content-between gap-025`}>
          <span className={`shimmer rounded`} style={{ width: `60px`, height: `10px` }} />
          <span className={`shimmer rounded`} style={{ width: `40px`, height: `10px` }} />
        </div>
      </div>
    )

  return (
    <figure
      className={`${styles.profile} flex align-items-center`}
      onClick={(e) => {
        e.stopPropagation()
        router.push(`/u/${addr}`)
      }}
    >
      {!profile.data.Profile[0].profileImages[0]?.isSVG ? (
        <img
          alt={profile.data.Profile[0].name || `Default PFP`}
          src={`${profile.data.Profile[0].profileImages.length > 0 ? profile.data.Profile[0].profileImages[0].src : 'https://ipfs.io/ipfs/bafkreiatl2iuudjiq354ic567bxd7jzhrixf5fh5e6x6uhdvl7xfrwxwzm'}`}
          className={`rounded`}
        />
      ) : (
        <div dangerouslySetInnerHTML={{ __html: profile.data.Profile[0].profileImages[0].src }}></div>
      )}
      <figcaption className={`flex flex-column`}>
        <div className={`flex align-items-center gap-025`}>
          <b>{profile.data.Profile[0].name ?? defaultUsername}</b>
          <BlueCheckMarkIcon />
          <div className={`${styles.badge}`} title={chain && chain.name} dangerouslySetInnerHTML={{ __html: `${chain && chain.icon}` }}></div>
        </div>
        <code className={`text-secondary`}>{`${addr.slice(0, 4)}…${addr.slice(38)}`}</code>
      </figcaption>
    </figure>
  )
}
