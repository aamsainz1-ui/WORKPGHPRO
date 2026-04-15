import React, { useState } from 'react';

const DAILY_ROOM_URL = 'https://globalworktime.daily.co/mkt-meeting';

const MeetingRoom: React.FC = () => {
  const [joined, setJoined] = useState(false);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">🎙️ ห้องประชุม MKT</h2>

      {!joined ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <div className="text-6xl mb-4">🎙️</div>
          <p className="text-gray-300 mb-2">ห้องประชุมทีม MKT</p>
          <p className="text-gray-500 text-sm mb-6">พูดคุยด้วยเสียง | แชทในห้อง</p>
          <button
            onClick={() => setJoined(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition"
          >
            เข้าร่วมประชุม
          </button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ height: '600px' }}>
          <iframe
            src={DAILY_ROOM_URL}
            allow="camera; microphone; fullscreen; speaker; display-capture"
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="MKT Meeting Room"
          />
          <div className="mt-3 text-center">
            <button
              onClick={() => setJoined(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg text-sm transition"
            >
              ออกจากห้อง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MeetingRoom;
