INSERT INTO users (name, email)
VALUES
    ('Michael', 'michael@example.com'),
    ('Sarah', 'sarah@example.com'),
    ('John', 'john@example.com');

INSERT INTO teams (name)
VALUES
    ('Tahoe Search & Rescue');

INSERT INTO team_members (team_id, user_id)
VALUES
    (1, 1),
    (1, 2),
    (1, 3);

INSERT INTO missions (
    team_id,
    name,
    location,
    started_at
)
VALUES (
    1,
    'Lost Hiker Search',
    'Donner Summit',
    NOW()
);